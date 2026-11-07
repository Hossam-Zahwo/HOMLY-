# HOMEY & SODFA Orders Manager — Render preview

Temporary isolated branch; does not modify the HOMEY storefront production branch.

Built with Next.js 15, React 19, TypeScript. Preview uses fictional client/order records, local browser state only, and no Google Sheets credentials. Do not enter real customer data. Full production source and Google Sheets API code are included in separate supplied ZIP artifact.

Build: `npm install && npm run build`  Start: `npm run start`

The complete persistent application is in the user-provided `HOMEY_SODFA_NextJS_TSX_Render_Ready.zip`, and should be moved to its own private repo with credentials stored only in Render Environment.
