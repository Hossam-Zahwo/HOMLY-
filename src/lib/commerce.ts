import { type ImagePurpose } from './image-optimization';
import { uploadCloudinaryImage } from './cloudinary-upload';
import { supabase, requireConnection } from './supabase';
// Probe ONE known public image without blocking catalog rendering. During Supabase
// 402 we show lightweight placeholders. Once the gateway responds 200 again,
// reload the same saved product paths to restore actual media automatically.
let legacyImagesAreAvailable = false;
let lastLegacyImageProbe = 0;
let mediaProbeActive = false;
function probeLegacyImageAvailability() {
 if (typeof window === 'undefined') return;
 if (legacyImagesAreAvailable || mediaProbeActive || import.meta.env.VITE_HOMEY_IMAGES_ON_NEW_PROJECT === 'true') return;
 const now = Date.now();
 if (now - lastLegacyImageProbe < 300000) return;
 lastLegacyImageProbe = now;
 mediaProbeActive = true;
 const controller = new AbortController();
 const timer = window.setTimeout(() => controller.abort(), 1400);
 const test = 'https://hlcatmtjrmqaakwvfkwf.supabase.co/storage/v1/object/public/homly-products/010ba87b-735b-498b-8d17-754c648f180e.jpeg';
 void fetch(test, {method: 'HEAD', mode: 'cors', cache: 'no-store', signal: controller.signal})
   .then(result => {
     if (!result.ok) return;
     legacyImagesAreAvailable = true;
     window.dispatchEvent(new Event('homy-catalog-changed'));
   })
   .catch(() => {})
   .finally(() => { window.clearTimeout(timer); mediaProbeActive = false; });
}
export type Category = {
    id: string;
    name_ar: string;
    slug: string;
    image_path: string;
    is_active: boolean;
    sort_order: number;
};
export type Variant = {
    id: string;
    product_id: string;
    sku: string;
    slug: string;
    title_override: string | null;
    description_override: string | null;
    price_minor: number;
    compare_at_minor: number | null;
    stock_on_hand: number;
    stock_reserved: number;
    status: string;
    is_listed: boolean;
    combination_key: string;
    sort_order: number;
    options: Record<string, string>;
    images: string[];
};
export type Product = {
    id: string;
    title_ar: string;
    description: string;
    specifications: Record<string, string>;
    kind: 'simple' | 'variable';
    display_mode: 'grouped' | 'separate_variants';
    status: string;
    categories: string[];
    images: string[];
    variants: Variant[];
    created_at?: string;
};
export type Catalog = {
    products: Product[];
    categories: Category[];
};
export type Zone = {
    id: string;
    governorate: string;
    areas: string[];
    fee_minor: number;
    is_active: boolean;
};
export type ShippingPromotion = {
    enabled: boolean;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
};
export function effectiveShippingFee(zone: Zone | undefined, promotion: ShippingPromotion | null): number {
    return zone ? (promotion?.is_active ? 0 : zone.fee_minor) : 0;
}
export async function shippingPromotion(): Promise<ShippingPromotion> {
    requireConnection();
    const {data, error} = await supabase.rpc('homly_get_shipping_promotion');
    check(error);
    return data as ShippingPromotion;
}
export async function saveShippingPromotion(input: {enabled: boolean; starts_at: string | null; ends_at: string | null}): Promise<ShippingPromotion> {
    requireConnection();
    const {data, error} = await supabase.rpc('homly_set_shipping_promotion', {
        p_enabled: input.enabled, p_starts_at: input.starts_at, p_ends_at: input.ends_at,
    });
    check(error);
    return data as ShippingPromotion;
}
export type OrderItem = {
    id: string;
    variant_id: string;
    title_snapshot: string;
    sku_snapshot: string;
    image_snapshot: string;
    options_snapshot: Record<string, string>;
    unit_price_minor: number;
    quantity: number;
    line_total_minor: number;
};
export type Order = {
    checks?: {
        order_item_id: string;
        is_available: boolean;
    }[];
    id: string;
    code: string;
    customer_name: string;
    customer_phone: string;
    governorate: string;
    area: string;
    address: string;
    customer_notes: string;
    fulfillment_status: string;
    payment_status: string;
    payment_method: string;
    subtotal_minor: number;
    shipping_minor: number;
    discount_minor: number;
    total_minor: number;
    created_at: string;
    items: OrderItem[];
    history: {
        new_status: string;
        created_at: string;
        note?: string;
    }[];
};
export const money = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n / 100) + ' ج.م';
export const date = (d: string) => new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(d));
export const statuses: Record<string, string> = { new: 'جديد', confirmed: 'تم التأكيد', preparing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', return_requested: 'طلب إرجاع', returned: 'تم الإرجاع', delivery_failed: 'تعذر التسليم' };
export const paymentLabels: Record<string, string> = { unpaid: 'غير مدفوع', pending: 'بانتظار الدفع', paid: 'مدفوع', failed: 'فشل الدفع', partially_refunded: 'استرداد جزئي', refunded: 'تم الاسترداد' };
export const transitions: Record<string, string[]> = { new: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['shipped', 'cancelled'], shipped: ['delivered', 'delivery_failed', 'return_requested'], delivery_failed: ['shipped', 'return_requested'], delivered: ['return_requested'], return_requested: ['returned'], returned: [], cancelled: [] };
export function explain(e: unknown) { const msg = e instanceof Error ? e.message : String((e as any)?.message || e); return /PGRST|schema cache|does not exist|permission denied|row-level security|Could not find/i.test(msg) ? 'الربط يحتاج تهيئة جداول وصلاحيات أو وظائف هومي في Supabase. لم يتم حفظ أي نجاح وهمي. التفاصيل: ' + msg : msg; }
function check(error: any) { if (error)
    throw error; }
// Public visitors only download the fields required to render products. Admin retains
// full rows, so product editing and stock updates keep their existing behavior.
const publicColumns: Record<string, string> = {
    homly_products: 'id,title_ar,description,specifications,kind,display_mode,status,deleted_at,created_at',
    homly_categories: 'id,name_ar,slug,image_path,sort_order,is_active,deleted_at',
    homly_product_variants: 'id,product_id,sku,slug,title_override,description_override,price_minor,compare_at_minor,stock_on_hand,stock_reserved,status,is_listed,combination_key,sort_order',
    homly_product_images: 'product_id,variant_id,storage_path,sort_order',
    homly_product_categories: 'product_id,category_id',
    homly_product_options: 'id,name_ar',
    homly_option_values: 'id,label_ar',
    homly_variant_option_values: 'variant_id,option_id,value_id',
};
async function readCatalogTable(table:string, keys:string[], admin:boolean){
    const data:any[]=[];
    for(let offset=0;;offset+=1000){
        let query = supabase.from(table).select(admin ? '*' : publicColumns[table]);
        if (!admin && (table === 'homly_products' || table === 'homly_product_variants')) query = query.eq('status','published');
        if (!admin && table === 'homly_categories') query = query.eq('is_active',true);
        for(const key of keys) query = query.order(key,{ascending:table==='homly_products'&&key==='created_at'?false:true});
        const response=await query.range(offset,offset+999);
        check(response.error);
        const page=response.data||[];
        data.push(...page);
        if(page.length<1000)break;
    }
    return data;
}
export async function catalog(admin=false):Promise<Catalog>{
 if (!admin && import.meta.env.VITE_HOMEY_LIVE_CATALOG !== 'true') return emergencyCatalog();
 try {
   const result = await databaseCatalog(admin);
   return admin ? result : await recoverLiveCatalogMedia(result);
 } catch (error) {
   if (admin) throw error;
   // Keep the storefront visible during a temporary API outage.
   return emergencyCatalog();
 }
}
async function emergencyCatalog():Promise<Catalog>{
   probeLegacyImageAvailability();
   // The original Supabase project is 402-restricted. Public storefront only:
   // read a safe snapshot of published catalog rows, never orders or private data.
   const response = await fetch('/emergency/catalog-full.json', {cache: 'force-cache'});
   if (!response.ok) throw new Error('تعذر تحميل نسخة المنتجات المؤقتة');
   const snapshot = await response.json() as Catalog;
   // Recover only image fallbacks for identical product/variant IDs from the
   // reviewed media snapshot; never restore stale prices, stock or order data.
   const workingImages = await fetch('/emergency/catalog-working-images.json', {cache: 'force-cache'})
     .then(res => res.ok ? res.json() as Promise<Catalog> : null)
     .catch(() => null);
   const restoredImageByVariant = new Map<string, string>();
   for (const product of workingImages?.products || []) {
     for (const variant of product.variants || []) {
       const fallback = (variant as Variant & {legacy_image_url?: string}).legacy_image_url;
       if (fallback && fallback.startsWith('https://')) restoredImageByVariant.set(product.id + ':' + variant.id, fallback);
     }
   }
   const categoryImageFallback: Record<string, string> = {lighting:'/images/jars.png', bathroom:'/images/towels.png'};
   return {categories: snapshot.categories.map(c => ({...c,
     image_path: assetUrl(c.image_path).startsWith('/placeholder') ? categoryImageFallback[c.slug] || '/images/living.png' : assetUrl(c.image_path)
   })), products: snapshot.products.map(p => ({...p,
     images: p.images.map(src => assetUrl(src)),
     variants: p.variants.map(v => {
       const fromMainBucket = v.images.map(src => assetUrl(src)).filter(src => src && src !== '/placeholder.svg');
       const fromOldInventory = (v as Variant & {legacy_image_url?:string}).legacy_image_url || restoredImageByVariant.get(p.id + ':' + v.id);
       // Only show fallback photos for matching SKUs that were manually reviewed.
       // The current store's images take precedence as soon as their origin is available.
       const imageUrls = fromMainBucket.length ? fromMainBucket : fromOldInventory ? [fromOldInventory] : [];
       return {...v,images:imageUrls};
     })
   }))};
}
async function recoverLiveCatalogMedia(data:Catalog):Promise<Catalog>{
  const working = await fetch('/emergency/catalog-working-images.json', {cache:'force-cache'})
    .then(r=>r.ok ? r.json() as Promise<Catalog> : null).catch(()=>null);
  const reviewed = new Map<string,string>();
  for (const p of working?.products || []) for (const v of p.variants || []) {
    const photo = (v as Variant & {legacy_image_url?:string}).legacy_image_url;
    if(photo && photo.startsWith('https://')) reviewed.set(p.id + ':' + v.id, photo);
  }
  const categoryDefaults:Record<string,string>={lighting:'/images/jars.png',bathroom:'/images/towels.png'};
  return {
    categories:data.categories.map(c=>({...c,image_path:c.image_path==='/placeholder.svg' ? categoryDefaults[c.slug]||'/images/living.png' : c.image_path})),
    products:data.products.map(p=>({...p,
      images:p.images.filter(src=>src && src !== '/placeholder.svg'),
      variants:p.variants.map(v=>{
        const live = v.images.filter(src=>src && src !== '/placeholder.svg');
        const reviewedFallback = reviewed.get(p.id + ':' + v.id);
        return {...v,images:live.length?live:reviewedFallback?[reviewedFallback]:[]};
      })
    }))
  };
}
function adminAssetUrl(path:string|null):string {
  if (!path) return '/placeholder.svg';
  const source=String(path);
  if(source.startsWith('https://')||source.startsWith('http://')||source.startsWith('/')) return source;
  return 'https://hlcatmtjrmqaakwvfkwf.supabase.co/storage/v1/object/public/homly-products/' + source.replace(/^[/]+/,'');
}
async function databaseCatalog(admin:boolean):Promise<Catalog>{
 requireConnection();const [products,categories,variants,images,links,options,values,choices]=await Promise.all([
 readCatalogTable('homly_products',['created_at','id'],admin),readCatalogTable('homly_categories',['sort_order','id'],admin),readCatalogTable('homly_product_variants',['sort_order','id'],admin),readCatalogTable('homly_product_images',['sort_order','id'],admin),readCatalogTable('homly_product_categories',['product_id','category_id'],admin),readCatalogTable('homly_product_options',['id'],admin),readCatalogTable('homly_option_values',['id'],admin),readCatalogTable('homly_variant_option_values',['variant_id','option_id'],admin)]);
 const group=(rows:any[],key:string)=>{const map=new Map<string,any[]>();for(const row of rows){const list=map.get(row[key]);if(list)list.push(row);else map.set(row[key],[row])}return map};
 const imagesByProduct=group(images.filter(i=>!i.variant_id),'product_id'),imagesByVariant=group(images.filter(i=>i.variant_id),'variant_id'),categoriesByProduct=group(links,'product_id'),variantsByProduct=group(variants,'product_id'),choicesByVariant=group(choices,'variant_id'),optionById=new Map(options.map(o=>[o.id,o])),valueById=new Map(values.map(v=>[v.id,v]));
 return {categories:categories.filter(c=>!c.deleted_at&&(admin||c.is_active)).map(c=>({...c,image_path:(admin ? adminAssetUrl(c.image_path) : assetUrl(c.image_path))})),products:products.filter(p=>!p.deleted_at&&(admin||p.status==='published')).map(p=>({...p,categories:(categoriesByProduct.get(p.id)||[]).map(c=>c.category_id),images:(imagesByProduct.get(p.id)||[]).map(i=>admin ? adminAssetUrl(i.storage_path) : assetUrl(i.storage_path)),variants:(variantsByProduct.get(p.id)||[]).filter(v=>admin||v.status==='published').map(v=>({...v,images:(imagesByVariant.get(v.id)||[]).map(i=>admin ? adminAssetUrl(i.storage_path) : assetUrl(i.storage_path)),options:Object.fromEntries((choicesByVariant.get(v.id)||[]).map(c=>[optionById.get(c.option_id)?.name_ar||'الاختيار',valueById.get(c.value_id)?.label_ar||'']))}))}))};
}
export function assetUrl(path: string | null) {
 if (!path) return '/placeholder.svg';
 const source = String(path);
 const oldPrefix = 'https://hlcatmtjrmqaakwvfkwf.supabase.co/storage/v1/object/public/homly-products/';
 const newPrefix = 'https://tzbckxumztwwyytryarw.supabase.co/storage/v1/object/public/homly-products/';
 const onNew = import.meta.env.VITE_HOMEY_IMAGES_ON_NEW_PROJECT === 'true';
 const oldReady = import.meta.env.VITE_HOMEY_STORAGE_ORIGINAL_READY === 'true' || legacyImagesAreAvailable;
 if (source.startsWith(oldPrefix)) {
   if (onNew) return newPrefix + source.slice(oldPrefix.length);
   return oldReady ? source : '/placeholder.svg';
 }
 if (source.startsWith('https://') || source.startsWith('http://') || source.startsWith('/')) return source;
 if (onNew) return newPrefix + source.replace(/^[/]+/, '');
 return oldReady ? supabase.storage.from('homly-products').getPublicUrl(source).data.publicUrl : '/placeholder.svg';
}
export const availableStock = (v: Variant) => Math.max(0, Number(v.stock_on_hand || 0) - Number(v.stock_reserved || 0));
export function cards(products: Product[]) {
 const rows = products.flatMap(p => {
  const vs = p.variants.filter(v => v.status === 'published');
  if (p.status !== 'published') return [];
  // For grouped products, show an in-stock variant whenever one exists.
  const selected = p.display_mode === 'separate_variants'
   ? vs.filter(v => v.is_listed)
   : [...vs].sort((a,b) => Number(availableStock(b)>0)-Number(availableStock(a)>0) || a.price_minor-b.price_minor).slice(0,1);
  return selected.map(v => ({p,v}));
 });
 return rows.sort((a,b) => Number(availableStock(b.v)>0)-Number(availableStock(a.v)>0));
}
export function imageFor(p: Product, v?: Variant) { return v?.images[0] || p.images[0] || '/placeholder.svg'; }
export async function shippingZones(includeInactive = false): Promise<Zone[]> { requireConnection(); let q = supabase.from('homly_shipping_zones').select('id,governorate,areas,fee_minor,is_active'); if (!includeInactive)
    q = q.eq('is_active', true); const { data, error } = await q; check(error); return data || []; }
export function storedImagePath(url:string):string {
 // New media URL stays absolute so old and newly uploaded assets never collide.
 const newOrigin='https://tzbckxumztwwyytryarw.supabase.co/storage/v1/object/public/homly-products/';
 if(url.startsWith(newOrigin))return url;
 const marker='/storage/v1/object/public/homly-products/';
 if(url.includes(marker))return decodeURIComponent(url.split(marker)[1].split('?')[0]);
 return url;
}
export async function saveProduct(p: Product) { requireConnection(); const payload={...p,images:p.images.map(storedImagePath),variants:p.variants.map(v=>({...v,images:v.images.map(storedImagePath)}))}; const { data, error } = await supabase.rpc('homly_save_product', { payload }); check(error); if(typeof data!=='string'||!data)throw new Error('لم يصل معرف المنتج المحفوظ من قاعدة البيانات'); const saved=await supabase.from('homly_products').select('id').eq('id',data).single();check(saved.error);if(!saved.data?.id)throw new Error('تعذر التحقق من حفظ المنتج؛ حدّث القائمة قبل إعادة الحفظ'); window.dispatchEvent(new Event('homy-catalog-changed')); return data; }
export async function saveCategory(c: Partial<Category>) { requireConnection(); const {data,error}=await supabase.from('homly_categories').upsert({ ...c,id:c.id||undefined }).select('id').single();check(error);if(!data?.id)throw new Error('لم يصل تأكيد حفظ القسم من قاعدة البيانات'); }
/** Images are uploaded to Cloudinary only. Supabase stores HTTPS URLs, never binary media. */
export async function uploadImage(file: File, purpose: ImagePurpose = 'product'): Promise<string> {
    return (await uploadCloudinaryImage(file, purpose)).secure_url;
}

/** Existing Cloudinary images are automatically optimized at delivery time.
 * Legacy Supabase images can be migrated only when their source is reachable. */
export async function optimizeStoredAsset(image: string, purpose: ImagePurpose = 'product') {
    const url = assetUrl(image);
    if (url.startsWith('https://res.cloudinary.com/'))
        return {path: image, optimized: false, savedBytes: 0};
    if (!url.includes('/storage/v1/object/public/homly-products/'))
        throw new Error('اختار ملف الصورة الأصلي علشان نرفعه على Cloudinary.');
    const response = await fetch(url);
    if (!response.ok) throw new Error('تعذر الوصول للصورة القديمة (HTTP ' + response.status + '). ارفع نسختها الأصلية من جهازك.');
    const original = await response.blob();
    if (!['image/jpeg','image/png','image/webp'].includes(original.type)) throw new Error('الصورة القديمة غير مدعومة.');
    const uploaded = await uploadCloudinaryImage(new File([original], 'homey-recovered-image', {type:original.type}), purpose);
    return {path: uploaded.secure_url, optimized: true, savedBytes: Math.max(0, original.size-uploaded.bytes)};
}

/** Non-destructively migrate reachable legacy product images. Missing source
 * images must be uploaded manually; no placeholder or silent fallback is saved. */
export async function optimizeExistingProductImages(product: Product) {
    const allImages = [...product.images, ...product.variants.flatMap(v => v.images)];
    const replacements = new Map<string,string>();
    let optimizedCount=0, bytesBefore=0, bytesAfter=0;
    for (const image of new Set(allImages)) {
        const url = assetUrl(image);
        if (!url.includes('/storage/v1/object/public/homly-products/')) continue;
        const response = await fetch(url);
        if (!response.ok) throw new Error('تعذر استعادة صورة قديمة (HTTP '+response.status+'). لن يتم تغيير المنتج.');
        const original = await response.blob();
        if (!['image/jpeg','image/png','image/webp'].includes(original.type)) continue;
        const result = await uploadCloudinaryImage(new File([original],'homey-migrated-image',{type:original.type}),'product');
        replacements.set(image,result.secure_url);
        optimizedCount++;bytesBefore+=original.size;bytesAfter+=result.bytes;
    }
    if (optimizedCount) await saveProduct({
        ...product,
        images: product.images.map(img=>replacements.get(img)||img),
        variants: product.variants.map(v=>({...v,images:v.images.map(img=>replacements.get(img)||img)})),
    });
    return {optimizedCount,bytesBefore,bytesAfter};
}

export async function orders(): Promise<Order[]> { requireConnection(); const { data, error } = await supabase.from('homly_orders').select('*,homly_order_items(*),homly_order_status_history(*),homly_order_item_checks(*)').order('created_at', { ascending: false }); check(error); return (data || []).map(o => ({ ...o, items: (o.homly_order_items||[]).map((i:any)=>({...i,image_snapshot:assetUrl(i.image_snapshot)})), history: o.homly_order_status_history, checks: o.homly_order_item_checks || [] })); }
/** Only unfulfilled, unpaid orders can be permanently removed as test orders. */
export function isDeletableTestOrder(order: Order): boolean {
    return ['new', 'confirmed', 'preparing', 'cancelled'].includes(order.fulfillment_status)
        && ['unpaid', 'pending', 'failed'].includes(order.payment_status);
}
export async function deleteTestOrders(ids: string[]): Promise<number> {
    requireConnection();
    if (!ids.length || ids.length > 50 || new Set(ids).size !== ids.length) {
        throw new Error('حدد من طلب واحد لحد 50 طلب بدون تكرار.');
    }
    const { data, error } = await supabase.rpc('homly_delete_test_orders', { p_order_ids: ids });
    check(error);
    if (typeof data !== 'number' || data !== ids.length) {
        throw new Error('عدد الطلبات المحذوفة مش مطابق للاختيار. حدّث قائمة الطلبات وراجعها.');
    }
    window.dispatchEvent(new Event('homy-catalog-changed'));
    return data;
}
export async function setOrderStatus(id: string, status: string, note: string) { requireConnection(); const { error } = await supabase.rpc('homly_update_order_status', { p_order_id: id, p_status: status, p_note: note }); check(error); }
export type CheckoutPayload = {
    customer_name: string;
    customer_phone: string;
    governorate: string;
    area: string;
    address: string;
    customer_notes: string;
    shipping_zone_id: string;
    idempotency_key: string;
    items: {
        variant_id: string;
        quantity: number;
    }[];
};
export async function placeOrder(payload: CheckoutPayload):Promise<Order>{
 requireConnection();
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);let response;
 try{response=await supabase.rpc('homly_checkout_effective',{payload}).abortSignal(controller.signal)}catch{throw new Error('انقطع الاتصال قبل وصول تأكيد الطلب. أعد المحاولة بنفس البيانات لتجنب التكرار.')}finally{clearTimeout(timer)}
 const {data,error}=response;
 if(error)throw new Error(error.code==='PGRST202'?'خدمة تأكيد الطلب تحتاج تحديث SQL المرفق. لم يصل تأكيد حفظ؛ أعد المحاولة بعد تحديث القاعدة.':error.message);

 if(data?.error||!data?.id||!data?.code)throw new Error(data?.error||'لم يصل تأكيد موثوق من الخادم');
 return data;
}
export async function checkOrderItem(orderId: string, itemId: string, available: boolean) { requireConnection(); const { error } = await supabase.rpc('homly_check_order_item', { p_order_id: orderId, p_item_id: itemId, p_available: available }); check(error); }
export async function saveZone(zone: Partial<Zone>) { requireConnection(); const { error } = await supabase.rpc('homly_save_shipping_zone', { p_zone: zone }); check(error); }
export async function reorderCategories(ids: string[]) { requireConnection(); const { error } = await supabase.rpc('homly_reorder_categories', { p_ids: ids }); check(error); }

export async function removeCatalogItem(kind:'product'|'category',id:string){requireConnection();const {error}=await supabase.rpc('homly_remove_catalog_item',{p_kind:kind,p_id:id});check(error);window.dispatchEvent(new Event('homy-catalog-changed'))}
