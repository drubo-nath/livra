# SSLCommerz Payment Integration — Current Situation & Plan

> **Update (Oct 2026):** the underlying architecture now exists (gateway client,
> payment service, callback routes, result page, schema + baseline migration).
> See `docs/sslcommerz-proposal.md` for the phased plan to switch it on.
> The snapshot below predates that work and is kept for context.

Status snapshot of the LIVRA codebase (Oct 2026) for integrating SSLCommerz.
SSLCommerz is the BD gateway that aggregates bKash / Nagad / cards — the storefront
copy already promises it, but nothing is wired up yet.

## TL;DR

Checkout is fully built end-to-end (phone-verified ordering, cart, order persistence
in Postgres) **but no money is actually collected**. The payment-method picker
(bKash / Nagad / Card) is cosmetic — `placeOrder` records the choice and returns a
thank-you screen. There is no SSLCommerz package, no credentials in env, no payment
status or transaction columns in the DB, and no gateway callback routes.

## What exists today

| Area | File(s) | Current behavior |
| --- | --- | --- |
| Checkout UI | `src/app/checkout/page.tsx` | Requires Better Auth phone-verified session (or alternate recipient phone verified via OTP). Picker for `bkash / nagad / card`. Calls `placeOrder`, clears cart, fires `trackPurchase`, shows "Dhonnobad" screen. |
| Order creation | `src/lib/actions/orders.ts` | Server action re-reads prices from DB (client totals never trusted), computes shipping (free ≥ ৳2,500 else ৳120), creates order `LIO-XXXXXXXX` with status `pending`, inserts items, find-or-create customer by phone, sends SMS. **No payment step.** |
| Schema | `src/db/schema.ts` | `payment_method` enum: `cod` (legacy), `bkash`, `nagad`, `card`. `order_status`: `pending / confirmed / fulfilled / cancelled` — fulfillment only, no payment state. Money stored as whole-BDT integers. No `transactionId`, no payment status, no raw gateway payload. |
| Validation | `src/lib/validations.ts` | `checkoutSchema` includes `paymentMethod` — accepted but unused downstream. |
| Env | `.env.example` / `.env.local` | No SSLCommerz variables. `NEXT_PUBLIC_APP_URL` exists (needed for callback URLs). |
| API routes | `src/app/api/` | Only `auth` and `media`. No payment callback handlers. |
| Admin | `src/app/admin/orders/page.tsx` | Shows payment method label + fulfillment status selector only. |
| Copy already promising SSLCommerz | `src/app/faq/page.tsx`, `src/app/terms/page.tsx`, `src/components/cart/CartDrawer.tsx` | Storefront currently over-promises vs. reality. |
| Reusable infra | `src/lib/sms.ts`, `src/lib/analytics.ts`, `src/db/index.ts` (db circuit breaker) | SMS templates + analytics ready to reuse on payment events. |

Package manager is `pnpm` (`pnpm db:generate` / `db:push` for drizzle-kit migrations).

## Gaps / blockers

1. **Credentials** — need Store ID + Store Password (sandbox first) from the
   SSLCommerz merchant panel / developer docs (developer.sslcommerz.com).
2. **No payment state in DB** — needs a migration before any gateway work.
3. **No callback routes** — SSLCommerz requires public `success` / `fail` /
   `cancel` / `ipn` endpoints that it POSTs to.
4. **Order lifecycle mismatch** — order is currently considered "placed" the
   instant it is inserted, with no payment. Needs an "awaiting payment" phase and
   a post-payment confirmation trigger.
5. **Cart clears too early** — cart is cleared on `placeOrder` success; if payment
   is introduced, clearing must move to after a successful payment (with a
   recovery path on failure/cancel).
6. **Public URL** — callbacks must be publicly reachable. `NEXT_PUBLIC_APP_URL`
   must be set in each environment; local sandbox testing needs a tunnel
   (ngrok / cloudflared).
7. **Money format** — DB stores integer taka (1450); the SSLCommerz API wants
   decimal strings (`"1450.00"`) with `currency: BDT`.
8. **Email optional** — checkout allows empty email; `cus_email` is expected by
   the gateway (synthesize a placeholder since accounts are phone-first).
9. **No SDK installed** — the `sslcommerz` npm package is stale; calling the
   REST API directly with `fetch` avoids a new dependency.

## Proposed integration steps

1. **Env + config** — add to `.env.local` / `.env.example`:
   `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`,
   `SSLCOMMERZ_MODE=sandbox|live`. Create `src/lib/sslcommerz.ts` with endpoints:
   sandbox init `https://sandbox.sslcommerz.com/gwprocess/v4/api.php`,
   live init `https://securepay.sslcommerz.com/gwprocess/v4/api.php`,
   validation `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php`
   (live: `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php`).
2. **Schema migration** — add to `orders`: `paymentStatus` (`unpaid | paid | failed |
   cancelled | refunded`), `transactionId` (tran_id), `valId` + `bankTxnId`,
   `paymentDetails jsonb` (raw IPN). Run `pnpm db:generate && pnpm db:push`.
   Alternatively a separate `payments` table if multiple attempts per order must be kept.
3. **Initiate payment** — extend `placeOrder` (or add `createOrderAndPay`):
   create order as `pending / unpaid` → POST session-init to SSLCommerz with
   `tran_id = orderNumber`, `total_amount = total.toFixed(2)`, `currency = BDT`,
   customer fields, `shipping_method = NO`, `emi_option = 0`, callback URLs under
   `${NEXT_PUBLIC_APP_URL}/api/payment/...` → return the `GatewayPageURL` to the
   client and redirect (`window.location`).
4. **Callback route handlers** — `src/app/api/payment/{success,fail,cancel,ipn}/route.ts`:
   - `success` — SSLCommerz POSTs the result, then the user lands here. Redirect to a
     confirmation page, but mark `paid` only after validation (this POST is user-facing,
     not proof).
   - `fail` / `cancel` — mark the order's payment failed/cancelled, redirect to a
     friendly page with a "retry payment" action (re-init session for the unpaid order).
   - `ipn` — server-to-server source of truth. Call the validation API with
     `val_id` / `tran_id` + store credentials; on `status: VALID` **and** matching
     amount/currency/store → set `paymentStatus = paid`, order `confirmed`, send SMS,
     fire purchase analytics. IPN also covers users who close the tab right after paying.
5. **Security** — never trust the success POST or client data alone; always
   server-side validate via the validation API; verify amount, currency, and store
   id; make IPN handling idempotent (check current status before writing; IPN
   retries happen).
6. **UI changes** — checkout submit becomes "Redirecting to secure payment…"; new
   `/payment/success|failed|cancelled` pages; "Dhonnobad" thank-you moves behind
   successful payment; admin orders page gains payment status + transaction id;
   decide whether the bKash/Nagad/Card picker stays (the gateway page itself lets
   the customer choose method — either pass the preference or simplify to a single
   "Pay securely" step).
7. **Analytics timing** — move `trackPurchase` from order-creation to payment-confirmed.
8. **Testing** — sandbox test cards from SSLCommerz docs, tunnel for local callbacks,
   amount-tamper attempts, IPN resend from the sandbox panel, double-submit guard.

## Field mapping (LIVRA → SSLCommerz)

| LIVRA | SSLCommerz param | Notes |
| --- | --- | --- |
| `orders.orderNumber` (`LIO-XXXXXXXX`) | `tran_id` | Already unique + non-sequential. |
| `orders.total` (int BDT) | `total_amount` | `total.toFixed(2)` → `"1450.00"`. |
| — | `currency` | Always `BDT`. |
| `customerName` | `cus_name` | |
| `phone` (`01XXXXXXXXX`) | `cus_phone` | Normalize to `8801…` (`src/lib/phone.ts`). |
| `email` (optional) | `cus_email` | Fallback placeholder if empty. |
| `addressLine`, `city`, `postalCode` | `cus_add1`, `cus_city`, `cus_postcode` | |
| items summary | `product_name` | e.g. "LIVRA order LIO-… — 3 items". |
| — | `shipping_method`, `emi_option` | `NO`, `0`. |

## Open decisions

- Order-first-then-pay (recommended; keeps cart data + matches schema) vs.
  pay-first-then-create-order.
- Payment columns on `orders` vs. separate `payments` table (multi-attempt history).
- Keep or drop the payment-method picker.
- Refund flow — needs live credentials; refund via API or merchant panel manually.

## Implementation note

This repo runs Next.js 16.3.1 with breaking changes vs. older App Router knowledge —
per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before
writing the new route handlers / server code.
