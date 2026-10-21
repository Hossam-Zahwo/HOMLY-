import { createClient } from 'npm:@supabase/supabase-js@2';
const origins=(Deno.env.get('ALLOWED_ORIGINS')||'http://localhost:3001,http://localhost:8080,http://127.0.0.1:3001,http://127.0.0.1:8080').split(',').map(x=>x.trim()).filter(Boolean);
const readMap=(name:string):string[]=>{try{return Object.values(JSON.parse(Deno.env.get(name)||'{}')).filter((x):x is string=>typeof x==='string')}catch{return []}};
const publicKeys=[Deno.env.get('HOMY_PUBLIC_KEY'),Deno.env.get('SUPABASE_ANON_KEY'),...readMap('SUPABASE_PUBLISHABLE_KEYS')].filter(Boolean);
const secret=Deno.env.get('HOMY_SECRET_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||readMap('SUPABASE_SECRET_KEYS')[0];
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';const permitted=origins.includes(origin);
 const headers={'Access-Control-Allow-Origin':permitted?origin:'null','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:permitted?204:403,headers});
 if(req.method!=='POST'||!permitted)return reply({error:'Origin or method denied'},403);
 const url=Deno.env.get('SUPABASE_URL');
 if(!url||!secret||!publicKeys.length)return reply({error:'Checkout configuration missing'},503);
 const apiKey=req.headers.get('apikey');
 if(!apiKey||!publicKeys.includes(apiKey))return reply({error:'Invalid project public key'},401);
 try{
  if(Number(req.headers.get('content-length')||0)>20000)return reply({error:'Payload too large'},413);
  const text=await req.text();if(new TextEncoder().encode(text).length>20000)return reply({error:'Payload too large'},413);
  const body=JSON.parse(text);
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>100||typeof body.idempotency_key!=='string'||body.idempotency_key.length<8||body.idempotency_key.length>100)return reply({error:'Invalid order'},400);
  for(const item of body.items)if(!/^[0-9a-f-]{36}$/i.test(item.variant_id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>999)return reply({error:'Invalid item'},400);
  for(const key of ['customer_name','customer_phone','governorate','area','address','shipping_zone_id'])if(typeof body[key]!=='string'||body[key].length>500||!body[key].trim())return reply({error:'Invalid delivery details'},400);
  if(!/^01[0125]\d{8}$/.test(body.customer_phone))return reply({error:'Invalid Egyptian phone'},400);
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  let userId:string|null=null;const jwt=req.headers.get('authorization')?.replace(/^Bearer /i,'');
  if(jwt&&!publicKeys.includes(jwt)){const {data,error}=await db.auth.getUser(jwt);if(error||!data.user)return reply({error:'Invalid user session'},401);userId=data.user.id;}
  // Persistent limits are independent RPC calls, so an invalid order cannot roll back its attempt counter.
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
  for(const [key,limit] of [['phone:'+await hash(body.customer_phone),8],['client:'+await hash(ip),30]] as const){
   const {data,error}=await db.rpc('homly_checkout_rate_limit',{p_key:key,p_limit:limit});
   if(error)return reply({error:'Checkout rate service unavailable'},503);
   if(data!==true)return reply({error:'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.'},429);
  }
  const {data,error}=await db.rpc('homly_place_order',{payload:{customer_name:body.customer_name,customer_phone:body.customer_phone,governorate:body.governorate,area:body.area,address:body.address,customer_notes:String(body.customer_notes||'').slice(0,2000),shipping_zone_id:body.shipping_zone_id,idempotency_key:body.idempotency_key,items:body.items.map((i:{variant_id:string;quantity:number})=>({variant_id:i.variant_id,quantity:i.quantity})),payment_method:'cod'},p_user_id:userId});
  if(error){console.error('homly-checkout SQL error code',error.code);const message=/Shipping zone/.test(error.message)?'منطقة الشحن أو اسم المنطقة غير مطابق. اختر منطقة متاحة واكتب الحي ضمن المناطق المحددة.':/quantity unavailable|Empty\/invalid total/.test(error.message)?'منتج أو كمية لم تعد متاحة؛ حدّث السلة ثم حاول مرة أخرى.':/Invalid customer/.test(error.message)?'راجع الاسم ورقم الهاتف والعنوان.':/Request key/.test(error.message)?'أعد الطلب بنفس البيانات أو ابدأ طلبًا جديدًا بعد مراجعة الطلب السابق.':'تعذر اعتماد الطلب. راجع إعداد وظائف SQL والشحن والمنتجات ثم حاول مجددًا.';return reply({error:message},409)}
  return reply({order:data});
 }catch{return reply({error:'تعذر معالجة الطلب. راجع البيانات.'},400)}
});
