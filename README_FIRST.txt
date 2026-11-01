HOMEY SQL FIX V4 — SHORT STANDALONE STEPS (2026-11-01)

The previous SQL error occurred because execution stopped inside a function before the closing delimiter.
This version does not contain any dollar-quoted function bodies.

STEPS
1. Take a Supabase database backup first.
2. Go to Supabase > SQL Editor > New query.
3. Open 00_READ_ONLY_CHECK.sql and paste its full content. Run.
   All four checks must be true. If any false, stop and send the output.
4. Open a new SQL query for each file, in this exact order:
   01_PROMOTION_TABLE.sql
   02_READ_PROMOTION.sql
   03_SAVE_PROMOTION.sql
   04_FREE_SHIPPING_TRIGGER.sql
   05_CHECKOUT_RPC.sql
   06_GOVERNORATES.sql
   07_VERIFY.sql
5. Paste ONE COMPLETE file per query. Ctrl+A INSIDE the SQL editor to select all SQL text;
   check that it includes the ending semicolon. Then Run.
   Do not paste the filename or code-block fences. No need to run the older V3 file.
6. Check the result of 07_VERIFY.sql: table_ok/read_rpc_ok/save_rpc_ok/
   checkout_rpc_ok/trigger_ok must be true.
7. Refresh the HOMEY cart & admin. Test checkout with a low-risk test product/order.

Notes:
- Existing shipping prices and orders are not reset by this set.
- New governorates start inactive until you configure their shipping cost.
- If an error appears, STOP at that step and share filename + full error.
- There is no live Supabase connection in this delivery; these scripts are NOT
  guaranteed to match your database customizations until executed and tested.
