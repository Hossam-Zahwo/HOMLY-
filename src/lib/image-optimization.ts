/**
 * Image processing is done in the merchant's browser, before Storage receives the
 * file. No image service, API key or paid plan is required.
 * Uploaded filenames are UUIDs so long-lived CDN/browser caching is safe.
 */
export type ImagePurpose = 'product' | 'category' | 'hero' | 'editorial' | 'logo';

const presets: Record<Exclude<ImagePurpose, 'logo'>, { maxSide: number; quality: number }> = {
  product: { maxSide: 1400, quality: 0.80 },
  category: { maxSide: 900, quality: 0.80 },
  hero: { maxSide: 1920, quality: 0.82 },
  editorial: { maxSide: 1600, quality: 0.80 },
};

type DecodedImage = { width: number; height: number; draw: CanvasImageSource; close(): void };

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return { width: bitmap.width, height: bitmap.height, draw: bitmap, close: () => bitmap.close() };
    } catch { /* Fall through for older mobile browsers. */ }
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('تعذر قراءة الصورة؛ جرّب JPG أو PNG أو WebP.'));
      element.src = objectUrl;
    });
    return { width: img.naturalWidth, height: img.naturalHeight, draw: img, close: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export async function compressStoreImage(blob: Blob, purpose: ImagePurpose = 'product'): Promise<Blob> {
  // The brand logo is deliberately kept byte-for-byte, never regenerated/recompressed.
  if (purpose === 'logo' || typeof document === 'undefined' || !blob.type.startsWith('image/')) return blob;
  const { maxSide, quality } = presets[purpose];
  // Tiny inputs already cost little network bandwidth. Don't recompress them.
  if (blob.size <= 90 * 1024) return blob;
  let decoded: DecodedImage | undefined;
  try {
    decoded = await decodeImage(blob);
    if (!decoded.width || !decoded.height || decoded.width * decoded.height > 55_000_000) return blob;
    const scale = Math.min(1, maxSide / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return blob;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.draw, 0, 0, width, height);
    const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    canvas.width = 0;
    canvas.height = 0;
    // Some browsers silently return PNG instead of WebP; only accept real WebP.
    return result?.type === 'image/webp' && result.size < blob.size * 0.92 ? result : blob;
  } catch {
    // Upload the original rather than blocking the merchant on unsupported decoders.
    return blob;
  } finally {
    decoded?.close();
  }
}

/** Only enabled explicitly on projects that include Supabase paid image resizing. */
export const allowStorageTransforms = import.meta.env.VITE_HOMEY_IMAGE_TRANSFORMS === 'true';
const PUBLIC_MARKER = '/storage/v1/object/public/homly-products/';

const CLOUDINARY_UPLOAD = /^https:\/\/res\.cloudinary\.com\/efpylmbh\/image\/upload\//;
const isCloudinaryImage = (url: string) => CLOUDINARY_UPLOAD.test(url);

/**
 * Cloudinary generates device-sized, automatically compressed images on demand.
 * Keep the immutable uploaded original untouched and fall back to it on errors.
 */
export function supabaseResponsiveImage(url: string, width: number, quality = 78): string {
  if (isCloudinaryImage(url)) {
    const safeWidth = Math.max(96, Math.min(1920, Math.round(width)));
    const safeQuality = Math.max(60, Math.min(90, Math.round(quality)));
    return url.replace(CLOUDINARY_UPLOAD, 'https://res.cloudinary.com/efpylmbh/image/upload/f_auto,q_' + safeQuality + ',w_' + safeWidth + ',c_limit/');
  }
  if (!allowStorageTransforms || !url.includes(PUBLIC_MARKER)) return url;
  const [pathname] = url.split('?');
  return pathname.replace(PUBLIC_MARKER, '/storage/v1/render/image/public/homly-products/')
    + '?width=' + width + '&quality=' + quality + '&resize=contain';
}

export function hasResponsiveTransform(url: string): boolean {
  return isCloudinaryImage(url) || (allowStorageTransforms && url.includes(PUBLIC_MARKER));
}
