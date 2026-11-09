import { supabase } from './supabase';
import { compressStoreImage, type ImagePurpose } from './image-optimization';

const ALLOWED = new Set(['image/jpeg','image/png','image/webp']);
const MAX_ORIGINAL = 15*1024*1024;
const MAX_UPLOAD = 5*1024*1024;
type UploadResult={secure_url:string;public_id:string;bytes:number;format:string};

/** Reject unsigned uploads and uploads from anyone except a verified HOMEY admin. */
export async function uploadCloudinaryImage(file:File,purpose:ImagePurpose='product'):Promise<UploadResult> {
  if (!ALLOWED.has(file.type)||file.size>MAX_ORIGINAL) throw new Error('الصورة لازم تكون JPG أو PNG أو WebP وأقل من 15MB.');
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError||!session?.access_token)throw new Error('سجّل الدخول كأدمن هومي الأول.');
  const resized=await compressStoreImage(file,purpose);
  if(resized.size>MAX_UPLOAD)throw new Error('حجم الصورة بعد الضغط أكبر من 5MB. اختار صورة أصغر.');
  const signedResponse=await fetch('/api/media/sign',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({purpose}),cache:'no-store'});
  const signed=await signedResponse.json().catch(()=>null);
  if(!signedResponse.ok||!signed?.signature) throw new Error(signed?.error||'تعذر توقيع رفع الصورة. تأكد من إعدادات Cloudinary على السيرفر.');
  if(!/^[a-zA-Z0-9_-]+$/.test(signed.cloud_name))throw new Error('إعدادات Cloudinary غير صالحة.');
  const form=new FormData();
  form.set('file',resized,file.name.replace(/\.[^.]+$/,'')+(resized.type==='image/webp'?'.webp':'.jpg'));
  for(const key of ['api_key','timestamp','signature','public_id'] as const)form.set(key,String(signed[key]));
  const response=await fetch(`https://api.cloudinary.com/v1_1/${signed.cloud_name}/image/upload`,{method:'POST',body:form});
  const uploaded=await response.json().catch(()=>null);
  if(!response.ok||!uploaded?.secure_url||!uploaded?.public_id){
    const message=uploaded?.error?.message;
    if(typeof message==='string'&&/^Invalid Signature\b/i.test(message)){
      throw new Error('Cloudinary رفض توقيع الرفع. راجع تطابق مفتاح Cloudinary والسر على السيرفر، ثم جرّب تاني.');
    }
    throw new Error(message||'فشل رفع الصورة على Cloudinary.');
  }
  const parsed=new URL(uploaded.secure_url);
  if(parsed.protocol!=='https:'||parsed.hostname!=='res.cloudinary.com'||!parsed.pathname.startsWith('/'+signed.cloud_name+'/image/upload/')||uploaded.public_id!==signed.public_id)throw new Error('Cloudinary رجّع رابطًا غير متوقع، ولم يتم حفظ الصورة.');
  return {secure_url:uploaded.secure_url,public_id:uploaded.public_id,bytes:Number(uploaded.bytes)||resized.size,format:String(uploaded.format||'')};
}
