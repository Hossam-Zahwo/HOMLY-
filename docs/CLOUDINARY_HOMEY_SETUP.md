# HOMEY Cloudinary migration — development only

Cloud name: `homeyegypt`. This branch adds reusable browser compression/upload and server-only signing helpers; **it does not activate the Admin uploader yet**.

## Required setup
1. In Cloudinary Console > API Keys, copy the API Key and API Secret.
2. In Vercel **Preview environment only**, set `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. Never put the secret in `VITE_*` or GitHub.
3. Implement an authenticated server endpoint using the existing TanStack Start server route conventions. Validate the Supabase bearer/session token server-side, then check the same admin role used by the existing dashboard; call `signHomeyUpload({authorizedAdmin:true,sku})` only after both checks succeed.
4. Admin UI calls that endpoint for a fresh signature for **each** image, then `uploadHomeyImage` / `uploadHomeyImages`. Never enable unsigned upload presets.
5. After successful upload, store `secure_url` and `public_id` against the correct product/variant using existing Supabase schema. Never overwrite the previous image URL until the new upload and DB write both succeed. SKU is an organizational folder, not the authoritative relational key.
6. For storefront delivery, use Cloudinary responsive transformations `f_auto,q_auto,w_...` on validated Cloudinary URLs, while retaining original URLs for fallback. Avoid applying Cloudinary transforms to non-Cloudinary URLs.
7. Test JPG/PNG/WebP/AVIF, multiple uploads, unauthorized calls, missing credentials, wrong SKU, failures, variant matching, mobile images, and full admin workflow on Preview before any production rollout.

## Guardrails
- Existing Supabase images and database remain untouched.
- The 116-product catalog and previous SKU-linked image references must remain intact.
- Compression targets 350 KB but is not guaranteed; input cap is 30 MB and maximum dimension 1800px. Large input or unsupported formats show an error, not a silent failure.
- Cloudinary free tier has usage limits; monitor quota. Supabase Auth/DB restrictions (HTTP 402) will still block editing until its service resumes.
- Do not merge/deploy to production until admin authorization integration and end-to-end testing are complete.
