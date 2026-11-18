# HOMEY marketing tracking — staged, not deployed

Branch: `feature/marketing-tracking-predeploy-20261118`. This branch is intentionally separate from `main`.

## Implemented
- Existing GA4 measurement `G-C4D2XGGQVP` preserved, but its script is now opt-in and only loads after visitor consent and the feature flag is enabled; SPA navigation sends `page_view`.
- Meta Pixel initialization, `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`.
- GA4 ecommerce `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.
- Purchase only after `placeOrder` returns an order ID, with session-level repeat suppression and a stable Meta `eventID` for future CAPI deduplication.
- Optional consent banner with accept/reject controls. Advertising and analytics scripts are blocked until the visitor accepts.
- Amounts converted from piastres to EGP. No name, phone, or address included in events.
- Fixed a product-page conditional React hook issue.

## Before production
1. Set `VITE_MARKETING_TRACKING_ENABLED=true` only after privacy notice and consent banner behavior are verified; both scripts remain blocked until a visitor opts in.
2. Set `VITE_META_PIXEL_ID` to the actual numeric ID from Events Manager. Do not guess an ID.
3. Run `npm ci && npm run typecheck && npm test && npm run build` against this branch.
4. Validate GA4 DebugView and Meta Test Events on a safe test environment.
5. Set up Meta Conversions API separately using server-only credentials, server-side order verification and event ID deduplication; **not implemented yet**.
6. Confirm domain verification, consent management, and advertising account permissions in Meta; these are account settings and cannot be established from source code alone.
7. Do not create real checkout test orders without explicit approval.

## Safety
The tracking integration is OFF by default. This branch is not merged. No Vercel deployment, database migration, or production secrets change was performed. A GitHub-connected deployment integration may independently build branches; verify Vercel project settings before enabling automatic branch deployments.

## Known limitations
- No account Pixel ID or Meta server access token has been provided; real Meta Test Events cannot yet be verified.
- No full TypeScript/build/test execution has been completed in the current environment; do not merge until these pass.
- Consent preferences are saved in browser localStorage; a permanent privacy-settings control to change a past decision should be added before production.
- GA4 is intentionally inactive when the feature flag is off, including the formerly unconditional base tag.
