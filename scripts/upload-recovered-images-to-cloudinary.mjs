import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const rows=JSON.parse(await readFile('scripts/recovered-images-manifest.json','utf8')).rows;
const cloud=process.env.CLOUDINARY_CLOUD_NAME;
const apiKey=process.env.CLOUDINARY_API_KEY;
const apiSecret=process.env.CLOUDINARY_API_SECRET;
if(cloud!=='efpylmbh'||!apiKey||!apiSecret)throw Error('Missing Cloudinary credentials or unexpected cloud');
const apply=process.env.RECOVERED_IMAGES_APPLY==='YES';
const out={mode:apply?'apply':'dry-run',total:rows.length,success:[],failed:[],skipped:[]};
await mkdir('migration-reports',{recursive:true});
const save=()=>writeFile('migration-reports/recovered-images.json',JSON.stringify(out,null,2));
for(const row of rows){
 try{
  const url=new URL(row.storage_path);
  if(url.hostname!=='tzbckxumztwwyytryarw.supabase.co'||!url.pathname.startsWith('/storage/v1/object/public/homly-products/'))throw Error('Untrusted image source');
  if(!apply){out.skipped.push({id:row.id,source:row.storage_path,reason:'dry-run'});continue;}
  const source=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!source.ok)throw Error('Source HTTP '+source.status);
  const contentType=source.headers.get('content-type')||'';
  if(!contentType.startsWith('image/'))throw Error('Not an image: '+contentType);
  const bytes=await source.arrayBuffer();
  if(!bytes.byteLength||bytes.byteLength>20*1024*1024)throw Error('Invalid image size');
  const folder='homey/products/recovered-'+row.product_id;
  const timestamp=Math.floor(Date.now()/1000);
  const signature=createHash('sha1').update('folder='+folder+'&timestamp='+timestamp+apiSecret).digest('hex');
  const body=new FormData();
  body.set('file',new Blob([bytes],{type:contentType}),row.id+'.jpg');
  body.set('folder',folder);
  body.set('timestamp',String(timestamp));
  body.set('api_key',apiKey);
  body.set('signature',signature);
  const response=await fetch('https://api.cloudinary.com/v1_1/'+cloud+'/image/upload',{method:'POST',body,signal:AbortSignal.timeout(60000)});
  const result=await response.json();
  if(!response.ok||!result.secure_url)throw Error('Cloudinary upload HTTP '+response.status+': '+(result.error?.message||'unknown'));
  const check=await fetch(result.secure_url,{method:'HEAD',signal:AbortSignal.timeout(20000)});
  if(!check.ok)throw Error('Cloudinary verify HTTP '+check.status);
  out.success.push({id:row.id,product_id:row.product_id,variant_id:row.variant_id,oldUrl:row.storage_path,newUrl:result.secure_url,publicId:result.public_id});
 }catch(e){out.failed.push({id:row.id,reason:String(e?.message||e)});}
 await save();
}
await save();
console.log(JSON.stringify({mode:out.mode,total:out.total,uploaded:out.success.length,failed:out.failed.length,skipped:out.skipped.length}));
if(out.failed.length)process.exitCode=2;
