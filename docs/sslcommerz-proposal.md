# SSLCommerz Integration — Proposal to Move Further

Companion to `docs/sslcommerz-integration.md` (situation snapshot). This
proposal covers what has now been built (Phase 1 — the underlying
architecture), and the phased path to production, verified against the
official docs: https://developer.sslcommerz.com/doc/v4/ (API v4.00).

---

## 1. Built so far — Phase 1 (architecture, no checkout impact)

Checkout behavior is **unchanged** until Phase 2 is deliberately switched on.
All pieces are dormant until credentials + a public URL exist.

| File | Role |
| --- | --- |
| `src/lib/sslcommerz.ts` | Typed gateway client — Create & Get Session (`gwprocess/v4/api.php`), Order Validation API (`validator/api/validationserverAPI.php`), Transaction Query API (`merchantTransIDvalidationAPI.php`), IPN MD5 signature verification. Zero new dependencies (fetch + node:crypto). |
| `src/lib/payments.ts` | Payment domain service — the only writer of payment state. `finalizeSslczPayment` (validate → amount/currency check → idempotent mark-paid), `markSslczPaymentStatus` (never downgrades a paid order), `ipnStatusToTransition` (maps VALID / FAILED / CANCELLED / EXPIRED / UNATTEMPTED). |
| `src/app/api/payment/success/route.ts` | Gateway POST after (claimed) success. Validates via the API before trusting; redirects 303 → `/payment/result?status=success\|pending`. |
| `src/app/api/payment/fail/route.ts` | Gateway POST on decline → mark failed → 303 → `/payment/result?status=fail`. |
| `src/app/api/payment/cancel/route.ts` | Gateway POST on customer abandon → mark cancelled → 303 → `/payment/result?status=cancel`. |
| `src/app/api/payment/ipn/route.ts` | Server-to-server source of truth (covers users who never return). MD5 signature check (per official SDK recipe) → Validation-API-gated positive transitions, sign-gated negative transitions → idempotent update. Always answers 200. |
| `src/app/api/payment/callbacks.ts` | Shared callback plumbing (form parsing, result-URL builder). |
| `src/app/payment/result/page.tsx` | Customer-facing outcome page (success / pending / fail / cancel), site design, `noindex`. |
| `src/db/schema.ts` | `payment_status` enum (`unpaid / paid / failed / cancelled / refunded`) + `transactionId` (tran_id), `valId`, `bankTranId`, `riskLevel`, `paidAt`, `paymentDetails` (raw audit payload) on `orders`, with indexes. |
| `drizzle/0000_*.sql` | Baseline migration including the new enum/columns/indexes. |
| `.env.example` / `.env.local` | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SSLCOMMERZ_MODE` (`sandbox` \| `live`). |

Key invariants (mirroring the official security checkpoints):

1. **Nothing marks an order paid except a VALID/VALIDATED response from the
   Order Validation API** — the browser-facing success POST is never trusted
   on its own.
2. **Amount + currency are re-checked against the DB** (`currencyType` and
   `currencyAmount`/`amount` must equal `BDT` + `orders.total`).
3. **IPN is hash-verified** (`verify_sign`/`verify_key` MD5 method, mirroring
   SSLCommerz's official PHP SDK `SSLCOMMERZ_hash_verify`: listed keys present
   in the POST — including empty-string values — plus `store_passwd=md5(...)`,
   key-sorted, `&`-joined, MD5). Caveat: the example `verify_sign` in the
   developer docs does not verify against its own recipe (the fixture is
   illustrative — identical values are copied across the v3.5 and v4 docs), so
   the SDK source was followed. Because of that uncertainty, **positive (VALID)
   transitions are never blocked by the sign check** — they are gated by the
   credential-authenticated Validation API instead, so a recipe edge case can
   never lose a real payment. **Negative transitions (failed/cancelled) are
   sign-gated**, since they carry no other proof — worst case they are skipped
   and logged.
4. **Every transition is idempotent** — repeat IPN deliveries, page refreshes,
   and stale fail/cancel POSTs after a successful retry can never corrupt state
   (a paid order is never downgraded).
5. **Risk payments** (`risk_level = 1`) stay `pending` for manual review even
   after marking paid — per the gateway's own guidance.
6. `tran_id = orderNumber` (`LIO-XXXXXXXX`) — already unique + non-sequential,
   echoed back by the gateway and used as the join key everywhere.

## 2. Proposed flow once wired (Phase 2 target)

```
Checkout (phone-verified, cart priced server-side)
  └─ placeOrder: create order (paymentStatus: unpaid, status: pending,
     transactionId = orderNumber) inside the existing DB transaction
  └─ createSslczSession(...) with success/fail/cancel/ipn URLs
      total_amount = total.toFixed(2) · currency = BDT
      product_profile = physical-goods · emi_option = 0 · value_a = orderNumber
  └─ client redirects to GatewayPageURL (gateway page offers bKash/Nagad/cards)
Gateway → POST /api/payment/{success|fail|cancel}   (user-facing redirects)
Gateway → POST /api/payment/ipn                      (server-to-server truth)
  └─ verify MD5 sign → validate val_id via API → amount/currency check
  └─ paid → status "confirmed", paidAt, valId/bankTranId/riskLevel stored
  └─ risky (risk_level 1) → stays "pending" for manual review
Customer lands on /payment/result (success/pending/fail/cancel)
```

## 3. Phase 2 — wire checkout (the actual switchover)

Changes, in order:

1. **Apply the schema to the live DB** — `pnpm db:push` (drizzle-kit diffs the
   live DB and adds the enum/columns/indexes). Do **not** run `pnpm db:migrate`
   against the existing Neon DB: the DB was built via `db:push` and has no
   migration history, so the baseline SQL is only for fresh environments.
2. **`placeOrder` (`src/lib/actions/orders.ts`)** — after the order insert
   transaction, call `createSslczSession` with:
   - callback URLs built from the public base URL — set
     `NEXT_PUBLIC_APP_URL` in `.env.local` / hosting, or derive from request
     headers in the action (works for preview deploys too);
   - `cusEmail` — synth `${orderPhone}@sms.livra.bd`-style placeholder when the
     customer gives none (accounts are phone-first; the gateway requires it);
   - `productName` — comma-joined cart item names (255 max);
   - include `ipnUrl` (v4 lets you pass it per-transaction) **and** set the IPN
     URL in the merchant panel (both, for redundancy).
   - On session success: return `{ ok: true, orderNumber, redirectUrl }`; the
     checkout page then `window.location.assign(redirectUrl)`.
   - On session failure: return a clear error (order stays `unpaid`; a retry
     action can re-initiate for the existing order).
3. **Move post-purchase side effects**:
   - SMS confirmation (`orderConfirmationMessage`) — send after paid, not at
     order creation (otherwise we confirm orders that were never paid).
   - `trackPurchase` analytics — fire on the success result page, not in
     `placeOrder`.
   - Cart clearing (`clear()`) — keep at order creation (cart data is already
     snapshotted in `order_items`, and the bag must not survive a paid order).
     On fail/cancel the "retry" path re-adds nothing (order already exists;
     Phase 3 adds a retry-payment action).
4. **Payment-method picker** — recommended: collapse bKash/Nagad/Card into one
   "Pay securely (bKash · Nagad · Cards)" step since the hosted gateway page
   presents all channels anyway. Optional: preselect via `multi_card_name`
   (`bkash`, `dbblmobilebanking`, `visacard`, …) only if brand preference data
   is wanted later.
5. **Guard rails**: reject totals outside the gateway's 10.00–500000.00 BDT
   range (currently impossible with product pricing, but assert anyway);
   `paymentMethod` validation stays as-is (stored for analytics) or map to a
   single `card` value — decide with Phase 2.

Estimated effort: ~half a day of code + a day of sandbox testing.

## 4. Phase 3 — operations & UX polish

- Admin orders page: show `paymentStatus`, `transactionId`, `bankTranId`,
  risk badge; filter by payment status.
- Retry payment action: re-initiate a session for an existing `unpaid/failed`
  order (same tran_id is fine — the gateway records multiple transactions per
  tran_id and the query API returns them all).
- Customer order history in `/profile`: show payment status + order state.
- Reconciliation job (optional): nightly `querySslczTransactions` sweep for
  orders `unpaid` for > 24h to catch dropped IPNs.

## 5. Phase 4 — refunds

- Refund API (`validator/api/merchantTransIDvalidationAPI.php`, GET with
  `bank_tran_id`, `refund_amount`, `refund_remarks`) — note the live system
  requires **the merchant's public IP to be registered** with SSLCommerz.
- Admin "refund" button → set `paymentStatus = refunded`, keep the raw refund
  response in `paymentDetails`.

## 6. Merchant checklist (human steps, before Phase 2 testing)

1. **Sandbox store**: register at https://developer.sslcommerz.com/registration/
   → sandbox panel https://sandbox.sslcommerz.com/manage/ issues TEST
   credentials (store id/password). Sandbox mode (`SSLCOMMERZ_MODE=sandbox`)
   must use the **test** credentials — live credentials will fail against the
   sandbox host.
2. **IPN listener**: sandbox panel → My Stores → IPN Settings → enable HTTP
   listener → `https://<public-url>/api/payment/ipn`.
3. **Public URL for local dev**: expose the dev server (ngrok / cloudflared)
   and use that host for `NEXT_PUBLIC_APP_URL` + panel IPN setting.
4. **TLS check**: `curl https://sandbox.sslcommerz.com/public/tls/ -v` must
   report TLS okay (Node fetch ≥ 18 satisfies this by default).
5. **Live store**: https://signup.sslcommerz.com/register → verification +
   contract + bank settlement setup → live credentials + `SSLCOMMERZ_MODE=live`.

## 7. Sandbox test plan (Phase 2 acceptance)

| Case | Method | Expected |
| --- | --- | --- |
| Card success | 4111111111111111 · 12/26 · 111 (MC 5111…, AMEX 371111111111111) | paid + confirmed; result page success; SMS sent once |
| bKash/Nagad OTP | OTP `111111` or `123456` | paid via mobile-banking channel |
| Decline | Any failing card at the gateway | failed, result page fail, retry available |
| Cancel | Abandon gateway page | cancelled, nothing marked paid |
| Tab-close after pay | Pay, kill browser before redirect | IPN alone marks paid |
| IPN replay | Resend same IPN (sandbox panel) | still paid, no double update |
| Amount tamper | Forged success POST with wrong val_id/amount | rejected (invalid / amount-mismatch), logged |
| Stale fail after retry | fail POST after successful retry | skipped — paid order untouched |
| Risky payment | Force risk (per sandbox rules) | paid but order stays pending for review |

## 8. Open decisions (need a call before Phase 2)

1. **Picker UX**: keep bKash/Nagad/Card radio (pass as `multi_card_name`
   hints) vs. single "Pay securely" step (recommended).
2. **`paymentMethod` field**: keep recording the selected channel for
   analytics, or simplify to one value?
3. **Auto-confirm on paid** (current architecture) vs. admin manually confirms
   every paid order (current COD-era habit). Recommended: auto-confirm clean
   payments; risky ones already stay pending.
4. **Refunds**: via API (needs registered public IP) vs. manual merchant-panel
   refunds recorded by hand in admin.

## 9. Status of the live system

- Architecture is dormant: no checkout flow change, no gateway calls fire.
- `orders.paymentStatus` doesn't exist in the live DB yet — run `pnpm db:push`
  before switching Phase 2 on (safe: additive columns + enum + indexes only).
- Store credentials exist in `.env.local` (`SSLCOMMERZ_*`) — verify they are
  the **sandbox test** credentials before testing; keep live credentials out of
  the repo (`.env.local` is git-ignored) and rotate before go-live.
