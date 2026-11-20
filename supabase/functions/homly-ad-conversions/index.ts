// Database webhook -> marketing conversions. Never expose as a browser endpoint.
// Only an authenticated INSERT webhook carrying explicit stored consent can send.
// Configure function secrets in Supabase and deploy separately after review.
const enc = new TextEncoder();
const PIXEL_ID = '1062573933474128';
const TIKTOK_ID = 'DC0ACP3C77U78FB32HAG';
const WEBHOOK_SECRET = Deno.env.get('HOMEY_WEBHOOK_SECRET') || '';
const META_TOKEN = Deno.env.get('META_CAPI_ACCESS_TOKEN') || '';
const TIKTOK_TOKEN = Deno.env.get('TIKTOK_EVENTS_API_ACCESS_TOKEN') || '';

function reply(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});}
async function equalSecret(a:string,b:string):Promise<boolean>{
  const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);
  const aa=new Uint8Array(x),bb=new Uint8Array(y);
  return aa.length===bb.length && aa.every((n,i)=>n===bb[i]);
}
type OrderRow={id:string;created_at:string;total_minor:number;shipping_minor:number;analytics_consent?:boolean};
Deno.serve(async request=>{
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  if(!WEBHOOK_SECRET)return reply({error:'Not configured'},503);
  const presented=request.headers.get('x-homey-webhook-secret')||'';
  if(!presented||!(await equalSecret(presented,WEBHOOK_SECRET)))return reply({error:'Unauthorized'},401);
  if(Number(request.headers.get('content-length')||0)>65536)return reply({error:'Payload too large'},413);
  let input:Record<string,unknown>;
  try{input=await request.json();}catch{return reply({error:'Invalid JSON'},400);}
  if(input.type!=='INSERT'||input.schema!=='public'||input.table!=='homly_orders')return reply({skipped:'not an order insert'});
  const order=input.record as OrderRow|undefined;
  // Do not send server conversions for visitors who did not opt in.
  // The checkout must persist this exact field in a trusted database row.
  if(!order||order.analytics_consent!==true)return reply({skipped:'no recorded consent'});
  if(!/^[0-9a-f-]{36}$/i.test(order.id)||!Number.isFinite(order.total_minor)||!Number.isFinite(order.shipping_minor)||order.total_minor<0||order.shipping_minor<0)return reply({error:'Invalid trusted order'},422);
  const time=Math.floor(new Date(order.created_at).getTime()/1000);
  if(!Number.isFinite(time)||time<=0)return reply({error:'Invalid date'},422);
  const value=Math.max(0,(order.total_minor-order.shipping_minor)/100);
  const results:Record<string,string>={};
  if(META_TOKEN){
    try{
      const res=await fetch('https://graph.facebook.com/v24.0/'+PIXEL_ID+'/events',{
        method:'POST',headers:{authorization:'Bearer '+META_TOKEN,'content-type':'application/json'},
        body:JSON.stringify({data:[{event_name:'Purchase',event_time:time,event_id:order.id,action_source:'website',event_source_url:'https://www.homeyegypt.com/cart',custom_data:{currency:'EGP',value,order_id:order.id}}]}),
        signal:AbortSignal.timeout(10000)
      });
      const body=await res.json().catch(()=>({}));
      results.meta=res.ok&&!body.error?'sent':'error';
    }catch{results.meta='error';}
  }
  if(TIKTOK_TOKEN){
    try{
      const res=await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/',{
        method:'POST',headers:{'Access-Token':TIKTOK_TOKEN,'Content-Type':'application/json'},
        body:JSON.stringify({event_source:'web',event_source_id:TIKTOK_ID,data:[{event:'PlaceAnOrder',event_time:time,event_id:order.id,properties:{currency:'EGP',value,order_id:order.id,content_type:'product'}}]}),
        signal:AbortSignal.timeout(10000)
      });
      const body=await res.json().catch(()=>({}));
      results.tiktok=res.ok&&body.code===0?'sent':'error';
    }catch{results.tiktok='error';}
  }
  if(!Object.keys(results).length)return reply({error:'No platform configured'},503);
  if(Object.values(results).includes('error'))return reply({error:'Conversion delivery failed',status:results},502);
  return reply({ok:true,status:results});
});
