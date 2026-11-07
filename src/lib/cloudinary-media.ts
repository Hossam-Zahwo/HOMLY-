/** HOMEY Cloudinary image preparation and direct signed upload. Browser only. */
export type HomeyUploadedImage = { secure_url: string; public_id: string; width: number; height: number; bytes: number; format: string };
export type SignedUpload = { cloud_name: string; api_key: string; timestamp: number; signature: string; folder: string };
const MAX_SIDE = 1800;
const TARGET_BYTES = 350 * 1024;
const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
export async function prepareHomeyImage(file: File): Promise<File> {
  if (!ACCEPTED.has(file.type)) throw new Error('صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP أو AVIF.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('الصورة أكبر من 30 MB. صغّرها قبل الرفع.');
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('تعذّر تجهيز الصورة');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const quality of [0.84, 0.76, 0.66, 0.55]) {
      blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (!blob) throw new Error('المتصفح لا يدعم ضغط الصور');
      if (blob.size <= TARGET_BYTES) break;
    }
    if (!blob) throw new Error('تعذّر ضغط الصورة');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } finally { bitmap.close(); }
}
/** signer must be an authenticated admin-only endpoint. Do not use unsigned presets. */
export async function uploadHomeyImage(file: File, signer: () => Promise<SignedUpload>): Promise<HomeyUploadedImage> {
  const prepared = await prepareHomeyImage(file);
  const signed = await signer();
  if (signed.cloud_name !== 'efpylmbh') throw new Error('Cloudinary account mismatch');
  const data = new FormData();
  data.set('file', prepared);
  for (const key of ['api_key', 'timestamp', 'signature', 'folder'] as const) data.set(key, String(signed[key]));
  const response = await fetch('https://api.cloudinary.com/v1_1/efpylmbh/image/upload', { method: 'POST', body: data });
  const result = await response.json();
  if (!response.ok || !result.secure_url || !result.public_id) throw new Error(result.error?.message || 'فشل رفع الصورة');
  return { secure_url: result.secure_url, public_id: result.public_id, width: result.width, height: result.height, bytes: result.bytes, format: result.format };
}
export async function uploadHomeyImages(files: File[], signer: () => Promise<SignedUpload>, onProgress?: (done: number, total: number) => void) {
  const results: Array<{ file: string; image?: HomeyUploadedImage; error?: string }> = [];
  for (const file of files) {
    try { results.push({ file: file.name, image: await uploadHomeyImage(file, signer) }); }
    catch (error) { results.push({ file: file.name, error: error instanceof Error ? error.message : String(error) }); }
    onProgress?.(results.length, files.length);
  }
  return results;
}
