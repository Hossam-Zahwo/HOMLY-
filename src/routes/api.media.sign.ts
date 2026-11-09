import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
// No Node-only package or client-side secret is needed.
declare const process: { env: Record<string,string|undefined> };

// Credentials are server-only, NEVER VITE_ variables. Do not cache signatures.
const error=(message:string,status:number)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export const Route=createFileRoute('/api/media/sign')({
  server:{handlers:{
    POST:async({request})=>{
      const env=process.env;
      const cloud_name=env.CLOUDINARY_CLOUD_NAME?.trim();
      const api_key=env.CLOUDINARY_API_KEY?.trim();
      const secret=env.CLOUDINARY_API_SECRET?.trim();
      const url=env.VITE_SUPABASE_URL;
      const publishable=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
      if(!cloud_name||!api_key||!secret||!url||!publishable)return error('ربط Cloudinary غير مكتمل على السيرفر.',503);
      const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._~-]+)$/)?.[1];
      if(!token)return error('لازم تسجل الدخول كأدمن هومي.',401);
      let purpose='product';
      let usePublicId=false;
      try{const input=await request.json();purpose=input?.purpose;usePublicId=input?.signatureVersion===2;}catch{return error('بيانات الرفع غير صالحة.',400)}
      if(!['product','category','hero','editorial','logo'].includes(purpose))return error('نوع الصورة غير مدعوم.',400);
      // Validate access token with Supabase Auth, then authorize via the existing
      // database-backed admin function. Browser can never sign its own uploads.
      const client=createClient(url,publishable,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
      const {data:{user},error:authError}=await client.auth.getUser(token);
      if(authError||!user)return error('انتهت جلسة الدخول. سجّل الدخول من جديد.',401);
      const {data:isAdmin,error:roleError}=await client.rpc('homly_is_admin');
      if(roleError||isAdmin!==true)return error('الحساب غير مصرح له برفع الصور.',403);
      // The existing homly_check_image() SQL function requires this exact URL prefix
      // and a unique segment after homey/products. Do not change without a DB migration.
      if(cloud_name!=='efpylmbh')return error('Cloudinary project does not match the database allowlist.',503);
      const folder='homey/products/'+crypto.randomUUID();
      const parameters=usePublicId?{public_id:folder+'/image'}:{folder};
      const timestamp=Math.floor(Date.now()/1000);
      const encoder=new TextEncoder();
      // Cloudinary upload signatures are SHA-1 of canonical parameters + API secret,
      // NOT an HMAC-SHA1. Keep the secret on the server only.
      const [name,value]=Object.entries(parameters)[0];
      const canonical=name+'='+value+'&timestamp='+timestamp;
      const digest=await crypto.subtle.digest('SHA-1',encoder.encode(canonical+secret));
      const signature=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
      return Response.json({cloud_name,api_key,...parameters,timestamp,signature},{headers:{'Cache-Control':'no-store'}});
    },
  }},
});
