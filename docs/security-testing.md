# Security Testing Plan — Common Vulnerabilities

Practical, executable test plan covering the common vulnerability classes
(OWASP Top 10 + payment-gateway + Next.js specific) against the LIVRA stack.
Companion docs: `docs/sslcommerz-proposal.md` (payment test matrix),
`docs/sslcommerz-integration.md` (situation snapshot).

## Ground rules

1. **Never run `pnpm db:push` / `db:migrate` (anything that alters the DB)
   without explicit owner approval** — the Neon DB is production.
2. Run attack tests against localhost or a preview deployment, never the
   production domain, except read-only checks.
3. OTPs, SMS, and order confirmations print to the server console in dev
   (`SMS_NET_BD_API_KEY` empty) — check `next dev` output while testing.
4. Rate-limit tests only enforce with a real Arcjet key (`AJT_ENV` set).
   Without a key Arcjet runs in dry run: decisions are logged, never enforced.

## Attack surface map

| Surface | Entry points | Guarded by |
| --- | --- | --- |
| Customer auth | `src/app/api/auth/[...all]` (better-auth, phone OTP) | better-auth `rateLimit` (20/min) + sessions |
| Order OTP | `sendOrderOtpAction` / `verifyOrderOtpAction` (server actions) | Arcjet `otp-actions` 10/10min per IP + HMAC token |
| Checkout | `placeOrder` server action | phone-verified session, server-side pricing |
| Payment callbacks | `POST /api/payment/{success,fail,cancel,ipn}` | Arcjet (30/min, IPN 120/min) + Validation-API gate + MD5 sign |
| Payment result | `/payment/result?status=&order=` | reads DB by tran_id (see F1) |
| Admin portal | `/atelier-portal` + `/admin/*` pages + admin server actions | `requireAdmin()` role check (admin.ts:20) |
| Media | `GET /api/media/[...key]` | prefix + traversal checks, private bucket, 5-min presigned URLs |
| Uploads | admin product image actions | type/size validation (storage.ts:32-38) |

## Arcjet integration (what was added)

- `src/lib/arcjet.ts` — root client (`shield` LIVE) + derived limiters:
  `ajPayment` 30/min per IP, `ajIpn` 120/min, `ajOtp` 10 per 10 min.
  Without `AJT_ENV` → dry run (fail-open, logged). With key → enforced.
- Payment routes call `arcjetGuard()` (callbacks.ts) before any processing.
- OTP actions call `otpRateLimited()` before sending/verifying.
- To add more endpoints later: create a limiter in `src/lib/arcjet.ts`
  (`root.withRule(fixedWindow({...}))`) and guard before logic.

## Test matrix

### A. Rate limiting / brute force (A04, A07)

| # | Test | How | Expected |
| --- | --- | --- | --- |
| A1 | OTP send flood | From one IP: trigger "Send OTP" 11× within 10 min on `/checkout` (alternate phone flow) | First 10 send SMS; 11th returns "Too many verification attempts…" (needs `AJT_ENV` key; without it the denial is only logged) |
| A2 | OTP code brute force | Submit 11 wrong 6-digit codes | Blocked by same limit at attempt 11; codes are single-use + 5-min expiry |
| A3 | Login OTP flood | Request better-auth phone OTP 21× in a minute | better-auth `rateLimit` (20/60s) blocks |
| A4 | Payment callback flood | `for i in $(seq 1 40); do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/payment/success -d "tran_id=LIO-TEST&val_id=x"; done` | 30× 303/3xx, then 429 with `Retry-After: 60` (with key) |
| A5 | IPN flood | Same loop against `/api/payment/ipn`, 130 iterations | ~120 allowed, then 429 (gateway retries stay well under the limit) |
| A6 | Arcjet unavailable | Unset `AJT_ENV`, repeat A1 | No denials, no crashes — fail-open with `[unauthenticated] unauthorized` errors logged |

### B. Payment gateway attacks (A08 + gateway-specific)

All against localhost with `SSLCOMMERZ_MODE=sandbox` and a tunnel if testing
gateway-origin POSTs; forged POSTs can be sent directly with curl.

| # | Test | How | Expected |
| --- | --- | --- | --- |
| B1 | Forged success POST | `curl -X POST localhost:3000/api/payment/success -d "tran_id=LIO-REAL&val_id=fakeVal123&status=VALID&amount=100"` | Redirect to `/payment/result?status=pending` — order NOT paid (validation API rejects fake val_id); log shows `outcome: invalid` |
| B2 | Amount tamper | Tamper a captured success POST body: change `amount` | `amount-mismatch` outcome, order not paid |
| B3 | IPN replay | Replay the same captured IPN twice | Second returns `already-paid`, no double update |
| B4 | Stale fail after retry | Send valid fail POST for an order that later got paid | `skipped-paid` — paid order never downgraded |
| B5 | MD5 sign tamper | Mutate any field of a captured IPN and re-sign nothing | Sign check fails; VALID still settles via validation API; FAILED/CANCELLED are dropped + logged |
| B6 | tran_id enumeration | POST success with random tran_ids | `not-found` outcome each time, no info leak beyond redirect |
| B7 | Full gateway E2E | Sandbox test-card payment per `docs/sslcommerz-proposal.md` §7 | Paid + confirmed + SMS once |

### C. Broken access control / IDOR (A01)

| # | Test | How | Expected |
| --- | --- | --- | --- |
| C1 | Admin pages unauthenticated | `curl -o /dev/null -w "%{http_code}" http://localhost:3000/admin` (and `/admin/orders`, `/admin/products`) | Redirect to secret login — no admin content |
| C2 | Admin actions as customer | While logged in as a phone-OTP customer, call `updateOrderStatus` via devtools (server action replay) | "Unauthorized" error (requireAdmin) |
| C3 | Admin API without session | Forge POST to any admin server action with no cookies | Rejected; server actions are POST-only + origin-checked by Next |
| C4 | Order info leak (result page) | Visit `/payment/result?order=LIO-XXXXXXXX` guessing numbers | **Finding F1** — valid order number leaks total + payment status to anonymous users. Order numbers are 8 random hex (≈4B space) so enumeration is impractical, but tighten when convenient |
| C5 | Media traversal | `/api/media/products/../bucket-creds`, `/api/media/other-prefix/x`, `/api/media/products/..%2Fx` | 404 for all — segment validation in route + object keys are prefix-bound |
| C6 | robots.txt ≠ auth | Fetch `/admin` per robots.txt disallow | Blocked by C1's auth, not by robots (expected; robots is not a security control) |

### D. Injection / XSS (A03)

| # | Test | How | Expected |
| --- | --- | --- | --- |
| D1 | SQL injection | `<script>`-tag + `' OR 1=1 --` in search/filters/checkout fields (`/shop?q=`, address, name) | No error/dump — all queries via drizzle bound params (verified: `sql` templates only bind columns, queries.ts:188,224; admin.ts:339) |
| D2 | Reflected XSS | Script payloads in query params + form fields | React auto-escapes; no execution |
| D3 | **Stored XSS via admin (JSON-LD)** | Set a product name to `</script><script>alert(1)</script>` (admin form) and open its product page | **Finding F7** — breakout possible in JSON-LD `dangerouslySetInnerHTML` blocks (product/[slug], shop, layout). Admin-only input, but fix: escape `<` as `\u003c` before embedding |
| D4 | Newsletter email field | Oversized/junk values | zod validation rejects |

### E. Cryptography / secrets (A02, A05)

| # | Test | How | Expected |
| --- | --- | --- | --- |
| E1 | Secrets not in repo | `git ls-files | xargs grep -l "DATABASE_URL\|AJT_ENV\|SSLCOMMERZ_STORE" || echo clean` and `git check-ignore .env.local` | No committed secrets; `.env.local` ignored |
| E2 | No secrets client-side | `grep -r "NEXT_PUBLIC" .env.local` | Only GA/Pixel IDs are public-prefixed |
| E3 | Phone-token forgery | Craft `base64(payload).hmacSig` manually with wrong secret | `verifyOrderPhoneToken` rejects (timing-safe compare). **Finding F4** — `BETTER_AUTH_SECRET` has a hard-coded fallback value (phone-verify.ts) — if unset in prod, tokens forgeable. Fail closed instead |
| E4 | Payment sign recipe | Round-trip fixture test (mirrors SSLCommerz SDK recipe, see proposal §1 item 3) | Tampered values rejected |

### F. Headers / configuration (A05)

| # | Test | How | Expected |
| --- | --- | --- | --- |
| F1 | Security headers | `curl -sI https://<host>/ | grep -i "content-security-policy\|x-frame\|strict-transport\|x-content-type\|referrer-policy"` | **Finding F2** — none set today. Add via `next.config.ts` `headers()` (CSP, X-Frame-Options DENY, HSTS on prod, X-Content-Type-Options nosniff, Referrer-Policy) or Vercel config |
| F2 | TLS | Live domain over `https://` only | Vercel forces TLS 1.2+; gateway requires it |
| F3 | CORS on payment routes | `curl -X OPTIONS -H "Origin: https://evil.com" -i localhost:3000/api/payment/ipn` | No permissive CORS headers emitted |
| F4 | Server banner/version leak | Response headers | Next/Vercel minimal defaults, acceptable |

### G. Supply chain & availability (A06, A10)

| # | Test | How | Expected |
| --- | --- | --- | --- |
| G1 | Dependency audit | `npx pnpm audit` (or `npm audit`) | No known CVEs at high/critical; note Next 16.3.1 pinned |
| G2 | SSRF | Review all fetch targets — gateway URLs are constants built from mode + credentials; no user-controlled URL is ever fetched | Confirmed by review |
| G3 | Open redirect | All redirects are fixed (`redirect()` list, resultUrl origin-bound, media 302 → presigned URL of the same bucket) | Confirmed by review |
| G4 | Log hygiene | Grep dev logs during tests | No secrets/PII logged in prod paths; OTP codes print only when SMS key is empty (dev) |

## Findings register (as of Oct 2026)

| ID | Finding | Severity | Recommendation |
| --- | --- | --- | --- |
| F1 | `/payment/result?order=` leaks total + payment status anonymously | Low (random 8-hex ids) | Gate on session user or strip amount for anonymous views |
| F2 | No security headers | Medium | Add `headers()` in `next.config.ts` |
| F3 | OTP verify lacks DB-level attempt counter | Medium (Arcjet mitigates per-IP) | Add max-5-attempts counter to the verification row |
| F4 | Hard-coded `BETTER_AUTH_SECRET` fallback in phone-verify.ts | Medium (only if prod env missing) | Remove fallback — throw when secret unset |
| F5 | JSON-LD blocks embed admin strings unescaped (`</script>` breakout) | Medium (admin-only input) | `\u003c`-escape all JSON-LD embeds |
| — | dev console prints OTP codes | Info (dev-only) | Intentional dev convenience; keep SMS key set in prod |

## Regression cadence

- Re-run A and B blocks after any payment-flow change (Phase 2/3 in the
  SSLCommerz proposal).
- Re-run C/E after auth or admin changes.
- Re-run G1 monthly and after dependency upgrades.
- Before go-live: full matrix + fix F1–F5 or accept with note.
