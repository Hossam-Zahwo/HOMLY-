// Supabase Edge Function: authenticated database webhook for confirmed HOMEY orders.
// Configure HOMEY_WEBHOOK_SECRET and META_CAPI_ACCESS_TOKEN as function secrets.
// NEVER call this endpoint directly from the browser.
const pixelId = Deno.env.get('META_PIXEL_ID') || '1062573933474128';
const token = Deno.env.get('META_CAPI_ACCESS_TOKEN');
const secret = Deno.env.get('HOMEY_WEBHOOK_SECRET');
const apiVersion = Deno.env.get('META_GRAPH_API_VERSION') || 'v24.0';
const enc = new TextEncoder();

function json(body:unknown,status=200) {
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
}
async function matches(a:string,b:string) {
  const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);
  const xa=new Uint8Array(x),ya=new Uint8Array(y);
  return xa.every((v,i)=>v===ya[i]);
}
Deno.serve(async request=>{
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!secret || !token)return json({error:'Integration not configured'},503);
  const supplied=request.headers.get('x-homey-webhook-secret')||'';
  if(!supplied || !(await matches(supplied,secret)))return json({error:'Unauthorized'},401);
  let payload:Record<string,unknown>;
  try { payload=await request.json(); } catch {return json({error:'Invalid JSON'},400);}
  // Supabase Database Webhooks use {type,table,record,old_record,schema}.
  if(payload.type!=='INSERT' || payload.table!=='homly_orders')return json({skipped:true});
  const order=payload.record as Record<string,unknown>|undefined;
  if(!order || typeof order.id!=='string' || typeof order.total_minor!=='number')return json({error:'Invalid order'},400);
  const shipping=typeof order.shipping_minor==='number'?order.shipping_minor:0;
  const value=Math.max(0,(order.total_minor-shipping)/100);
  const metaEvent={
    event_name:'Purchase',
    event_time:Math.floor(Date.now()/1000),
    event_id:order.id,
    action_source:'website',
    event_source_url:'https://www.homeyegypt.com/cart',
    user_data:{},
    custom_data:{currency:'EGP',value,order_id:order.id}
  };
  // Do not fabricate IP, user agent or consent. No customer PII is sent.
  const url=new URL(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events`);
  const result=await fetch(url,{method:'POST',headers:{'authorization':`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({data:[metaEvent]})});
  if(!result.ok){console.error('Meta CAPI error',result.status);return json({error:'Meta refused event',status:result.status},502);}
  return json({ok:true,event_id:order.id});
});
