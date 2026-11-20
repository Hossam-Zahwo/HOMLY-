# HOMEY Egypt — analytics and ads integration (staged, not production)

## Platforms and IDs (public IDs only)
- Google Analytics 4: `G-C4D2XGGQVP`. Account linked to Google Ads `400-581-2760`; Google Ads conversion configuration is not confirmed.
- Meta Pixel: `1062573933474128`.
- TikTok Pixel: `DC0ACP3C77U78FB32HAG`.
- The tokens are NEVER present in GitHub source. Both TikTok and unverified Meta CAPI tokens are stored as **sensitive variables on the Vercel project `homly-tuzl`, Preview only**. These Vercel variables do not automatically become Supabase Edge Function secrets.

## Client tracking prepared
- Optional consent prompt controls loading Google gtag, Facebook Pixel, and TikTok Pixel.
- `page_view` / `PageView`, `view_item` / `ViewContent`, `add_to_cart` / `AddToCart`, `begin_checkout` / `InitiateCheckout`.
- COD order after verified `placeOrder` response: GA4 `purchase`, Meta `Purchase`, TikTok `PlaceAnOrder`; **not** TikTok `Purchase` or `CompletePayment`.
- EGP prices, content IDs, order ID as browser transaction ID / event ID. Tracked only with visitor opt-in.
- Browser sessionStorage deduplicates repeated purchase reporting within a session. Server/browser event ID must match for cross-channel dedup.

## Server-side CAPI — scaffold ONLY, NOT ACTIVE
- `supabase/functions/homly-ad-conversions/index.ts` implements a dedicated, authenticated Supabase database webhook receiver.
- A request must carry a valid `x-homey-webhook-secret`, be an INSERT on public.homly_orders, and the persisted row must include `analytics_consent === true`. Fail-closed without those checks.
- **BLOCKER:** `analytics_consent` is not yet persisted by the checkout SQL. Do not enable webhook until that column and trusted checkout logic are implemented and verified.
- **BLOCKER:** function secrets `HOMEY_WEBHOOK_SECRET`, `META_CAPI_ACCESS_TOKEN`, and `TIKTOK_EVENTS_API_ACCESS_TOKEN` must be set in Supabase's Edge Function secrets (not the client; Vercel Preview secrets don't reach this function).
- **BLOCKER:** function has not been deployed; INSERT webhook not configured; no live API verification. Meta token origin/type not verified. Current server payload lacks stable customer matching identifiers, so provider acceptance / matching performance is unknown.
- Existing `homly-meta-capi` is a separate, older function; avoid enabling it along with the unified function or purchases could double count.
- The `src/lib/tiktok-events.server.ts` sender is also currently a standalone transport only and is not invoked by checkout; don't expose it through a public endpoint.

## Production preflight
1. Verify `npm run typecheck`, `npm test`, `npm run build` and inspect Vercel Preview results.
2. Test browser events in GA4 DebugView, Meta Test Events, TikTok Test Events using a non-production checkout.
3. Create migration for trusted checkout consent persistence; do not edit the existing production checkout without migration + tests.
4. Configure Supabase Edge secrets and trusted webhook after consent persistence; verify request signature/secret.
5. Verify CAPI provider acceptance, retry behavior and delivery idempotency before enabling real traffic.
6. Audit that banner refusal sends **no** marketing events. Provide a withdrawal mechanism and update privacy notice.
7. Merge + deploy only with approval. GitHub PR remains a draft.

## Limits
- No ads launched, no campaigns created, no Google Ads conversion tags activated.
- Vercel may automatically create protected Preview builds on branch pushes.
