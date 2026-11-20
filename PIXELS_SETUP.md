# HOMEY Pixel & CAPI setup — not deployed

## Verified configuration
- Meta dataset / Pixel ID: `1062573933474128` (Homm Egypf – Pixel).
- Existing GA4 Measurement ID in root: `G-C4D2XGGQVP` (owner confirmation still needed).
- Supabase HOMEY project: `hlcatmtjrmqaakwvfkwf`, order table: `public.homly_orders`.
- No production deployment has been made as part of this branch.

## Frontend events prepared
- GA4: page_view, view_item, add_to_cart from product detail, begin_checkout from cart wizard, purchase after confirmed database response.
- Meta: PageView, ViewContent, AddToCart (product detail), InitiateCheckout and Purchase.
- EGP monetary values; `transaction_id` and `event_id` use the confirmed database order ID.
- Full storefront-card AddToCart is **not yet instrumented**. Repeated checkout attempts can produce additional BeginCheckout events.

## Server-side CAPI prepared, NOT enabled
`supabase/functions/homly-meta-capi/index.ts` receives authenticated INSERT webhooks from `public.homly_orders` and forwards Purchase to Meta. It fails closed until secrets exist.
- Configure Edge Function secrets `META_CAPI_ACCESS_TOKEN` (sensitive), `META_PIXEL_ID` (optional), `HOMEY_WEBHOOK_SECRET` (random secret).
- Never store CAPI token or webhook secret in GitHub or in any `VITE_` client environment variable.
- Deploy Edge Function only after secrets are provisioned.
- Configure a Supabase Database Webhook for INSERT on `public.homly_orders` pointing to the function URL. Add `x-homey-webhook-secret` HTTP header. Avoid enabling until tests and consent/notice are complete.
- If using `verify_jwt=false` for the webhook endpoint, the dedicated webhook secret check in the function is mandatory.
- Server Purchase includes no personal identifying information; event matching may be weak, requiring a consent-aware data policy and event matching implementation.
- The server and browser send matching event IDs to permit Meta deduplication, but this **must** be checked in Events Manager.

## Before merge or production
1. Run `npm run typecheck`, `npm test`, `npm run build`. Tests have NOT been run by this change.
2. Test on an authorized preview environment; check event deduplication and correctness in Meta Test Events and GA4 DebugView.
3. Confirm tracking consent/privacy requirements, and implement consent gating if required. The current frontend trackers do not include a consent banner.
4. Verify Google Analytics property ownership. Google Ads AW conversion ID and label still missing; no Google Ads conversion event was added.
5. Do not merge or deploy without approval. Review branch changes first.
