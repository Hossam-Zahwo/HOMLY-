# HOMEY pixels setup (pre-deployment)

The tracking integration is prepared on a separate branch. Do not merge or deploy before validating account ownership and test events.

## Needed from the account owner

- Meta Events Manager > Data Sources > Pixel/Dataset ID (numeric). Set `VITE_META_PIXEL_ID` in Vercel project environment variables. Do not put access tokens in public VITE_ variables.
- Google Analytics > Admin > Data streams > Web > Measurement ID. Current site code uses `G-C4D2XGGQVP`; verify this property is owned by HOMEY.
- If Google Ads conversions are required, provide the Google Ads Conversion ID (`AW-...`) and purchase conversion label; these have **not** been implemented yet.
- Confirm privacy/cookie-consent requirements before production enablement.

## Prepared events

- GA4: page_view, view_item, add_to_cart (product page), begin_checkout (opening checkout form), purchase (only after database confirms the order).
- Meta, when its Pixel ID is configured: PageView, ViewContent, AddToCart (product page), InitiateCheckout, Purchase.
- Purchase value excludes shipping and is in EGP. Each order ID is used for transaction and Meta event deduplication. The checkout continues even if tracking fails.

## Known follow-ups

- Add-to-cart from homepage/listing cards is not covered by this first pass.
- Google Ads conversion and server-side Meta CAPI require separate configuration and testing.
- Run `npm run typecheck`, `npm test`, `npm run build` and validate Meta Test Events / GA4 DebugView before merging.
- Existing Google Analytics script remains in the application root; confirm duplicate tags are not independently installed via GTM/Vercel.
