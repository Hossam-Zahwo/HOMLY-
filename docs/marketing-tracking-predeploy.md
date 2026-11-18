# HOMEY marketing tracking — staged, not deployed

Branch: `feature/marketing-tracking-predeploy-20261118`. This branch is intentionally separate from `main`.

## Implemented
- Existing GA4 measurement `G-C4D2XGGQVP` preserved; automatic initial page view disabled so SPA navigation sends a single `page_view`.
- Meta Pixel initialization, `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`.
- GA4 ecommerce `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.
- Purchase only after `placeOrder` returns an order ID, with session-level repeat suppression and a stable Meta `eventID` for future CAPI deduplication.
- Amounts converted from piastres to EGP. No name, phone, or address included in events.
- Fixed a product-page conditional React hook issue.

## Before production
1. Set `VITE_MARKETING_TRACKING_ENABLED=true` only after privacy/consent requirements are addressed and verified.
2. Set `VITE_META_PIXEL_ID` to the actual numeric ID from Events Manager. Do not guess an ID.
3. Run `npm ci && npm run typecheck && npm test && npm run build` against this branch.
4. Validate GA4 DebugView and Meta Test Events on a safe test environment.
5. Set up Meta Conversions API separately using server-only credentials, server-side order verification and event ID deduplication; **not implemented yet**.
6. Confirm domain verification, consent management, and advertising account permissions in Meta; these are account settings and cannot be established from source code alone.
7. Do not create real checkout test orders without explicit approval.

## Safety
The tracking integration is OFF by default. This branch is not merged. No Vercel deployment, database migration, or production secrets change was performed. A GitHub-connected deployment integration may independently build branches; verify Vercel project settings before enabling automatic branch deployments.
