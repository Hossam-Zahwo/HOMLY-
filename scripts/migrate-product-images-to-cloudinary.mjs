/**
 * One-time, operator-run migration. DRY RUN by default.
 * Requires: HOMEY_SUPABASE_URL, HOMEY_SUPABASE_SERVICE_ROLE_KEY,
 * CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 * Run: node scripts/migrate-product-images-to-cloudinary.mjs
 * Apply: HOMEY_MIGRATE_APPLY=YES node scripts/migrate-product-images-to-cloudinary.mjs
 * Never put the service-role key in Vercel public variables or Git.
 */
import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { extname } from 'node:path';

const required = ['HOMEY_SUPABASE_URL','HOMEY_SUPABASE_SERVICE_ROLE_KEY','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) { console.error('Missing environment variables: '+missing.join(', ')); process.exit(1); }
if (process.env.CLOUDINARY_CLOUD_NAME !== 'efpylmbh') throw new Error('Unexpected Cloudinary account');
const apply = process.env.HOMEY_MIGRATE_APPLY === 'YES';
const supabase = createClient(process.env.HOMEY_SUPABASE_URL,process.env.HOMEY_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket='homly-products';
const marker='/storage/v1/object/public/'+bucket+'/';
const oldBase=process.env.HOMEY_SUPABASE_URL.replace(/\/$/,'');
const report={startedAt:new Date().toISOString(),mode:apply?'apply':'dry-run',uploaded:[],skipped:[],failed:[],conflicts:[],originalCount:0};
await mkdir('migration-reports',{recursive:true});
const reportPath='migration-reports/cloudinary-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
async function checkpoint(){await writeFile(reportPath,JSON.stringify(report,null,2));}
async function fetchWithTimeout(url,options={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}}
async function sourceImage(path){
 if(path.startsWith('https://res.cloudinary.com/'))return null;
 if(path.startsWith('/images/'))return null; // local assets remain untouched
 if(path.startsWith('https://') && !path.includes(marker))return null;
 const key=path.includes(marker)?decodeURIComponent(path.split(marker)[1].split('?')[0]):path.replace(/^\/+/, '');
 if(!key||key.includes('..'))throw new Error('Unsafe storage path');
 const {data,error}=await supabase.storage.from(bucket).download(key);
 if(error)throw new Error('Supabase download: '+error.message);
 if(!data || !data.size)throw new Error('Empty source');
 return {data,key};
}
async function uploadCloudinary(blob,folder){
 const timestamp=Math.floor(Date.now()/1000);
 const params='folder='+folder+'&timestamp='+timestamp;
 const signature=createHash('sha1').update(params+process.env.CLOUDINARY_API_SECRET).digest('hex');
 const body=new FormData();
 body.set('file',blob,'image'+(blob.type==='image/png'?'.png':blob.type==='image/webp'?'.webp':'.jpg'));
 body.set('folder',folder);body.set('timestamp',String(timestamp));body.set('api_key',process.env.CLOUDINARY_API_KEY);body.set('signature',signature);
 const response=await fetchWithTimeout('https://api.cloudinary.com/v1_1/'+process.env.CLOUDINARY_CLOUD_NAME+'/image/upload',{method:'POST',body});
 const json=await response.json();
 if(!response.ok||!json.secure_url||!json.public_id)throw new Error('Cloudinary: '+(json.error?.message||response.status));
 if(!json.secure_url.startsWith('https://res.cloudinary.com/efpylmbh/image/upload/'))throw new Error('Unexpected Cloudinary URL');
 const verify=await fetchWithTimeout(json.secure_url,{method:'HEAD'});
 if(!verify.ok)throw new Error('Uploaded asset verification failed: '+verify.status);
 return json;
}
let offset=0;
const rows=[];
while(true){
 const {data,error}=await supabase.from('homly_product_images').select('id,product_id,variant_id,storage_path').order('id').range(offset,offset+999);
 if(error)throw new Error('Read images: '+error.message);
 rows.push(...data);
 if(data.length<1000)break;
 offset+=1000;
}
report.originalCount=rows.length;
const productIds=[...new Set(rows.map(r=>r.product_id))];
const skus=new Map();
for(let i=0;i<productIds.length;i+=100){
 const {data,error}=await supabase.from('homly_product_variants').select('id,product_id,sku').in('product_id',productIds.slice(i,i+100));
 if(error)throw new Error('Read variants: '+error.message);
 for(const v of data)skus.set(v.id,v.sku);
}
const bySource=new Map();
for(const row of rows){
 const original=row.storage_path;
 if(original.startsWith('https://res.cloudinary.com/')||original.startsWith('/images/')){report.skipped.push({id:row.id,reason:'Already cloudinary or local'});continue;}
 try{
  const sku=(row.variant_id?skus.get(row.variant_id):null)||'shared-'+row.product_id;
  const folder='homey/products/'+sku.toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,80);
  const cacheKey=folder+'|'+original;
  let uploaded=bySource.get(cacheKey);
  if(!uploaded){
   if(!apply){report.skipped.push({id:row.id,source:original,reason:'dry-run'});continue;}
   const src=await sourceImage(original);
   if(!src){report.skipped.push({id:row.id,reason:'Unsupported source'});continue;}
   uploaded=await uploadCloudinary(src.data,folder);
   bySource.set(cacheKey,uploaded);
  }
  // Optimistic concurrency: don't overwrite edits made since this run began.
  const {data:changed,error:updateError}=await supabase.from('homly_product_images').update({storage_path:uploaded.secure_url}).eq('id',row.id).eq('storage_path',original).select('id');
  if(updateError)throw new Error('DB update: '+updateError.message);
  if(changed.length!==1){report.conflicts.push({id:row.id,source:original,newUrl:uploaded.secure_url});}
  else report.uploaded.push({id:row.id,source:original,newUrl:uploaded.secure_url,publicId:uploaded.public_id});
 }catch(error){report.failed.push({id:row.id,source:original,error:error instanceof Error?error.message:String(error)});}
 await checkpoint();
}
report.finishedAt=new Date().toISOString();
await checkpoint();
console.log(JSON.stringify({reportPath,mode:report.mode,total:report.originalCount,migrated:report.uploaded.length,skipped:report.skipped.length,failed:report.failed.length,conflicts:report.conflicts.length},null,2));
if(report.failed.length||report.conflicts.length)process.exitCode=2;
