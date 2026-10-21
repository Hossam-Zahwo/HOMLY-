import { supabase, requireConnection } from './supabase';
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
export const money = (n: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(n / 100) + ' ج.م';
export const date = (d: string) => new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(d));
export const statuses: Record<string, string> = { new: 'جديد', confirmed: 'تم التأكيد', preparing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', return_requested: 'طلب إرجاع', returned: 'تم الإرجاع', delivery_failed: 'تعذر التسليم' };
export const paymentLabels: Record<string, string> = { unpaid: 'غير مدفوع', pending: 'بانتظار الدفع', paid: 'مدفوع', failed: 'فشل الدفع', partially_refunded: 'استرداد جزئي', refunded: 'تم الاسترداد' };
export const transitions: Record<string, string[]> = { new: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['shipped', 'cancelled'], shipped: ['delivered', 'delivery_failed', 'return_requested'], delivery_failed: ['shipped', 'return_requested'], delivered: ['return_requested'], return_requested: ['returned'], returned: [], cancelled: [] };
export function explain(e: unknown) { const msg = e instanceof Error ? e.message : String((e as any)?.message || e); return /PGRST|schema cache|does not exist|permission denied|row-level security|Could not find/i.test(msg) ? 'الربط يحتاج تهيئة جداول وصلاحيات أو وظائف هومي في Supabase. لم يتم حفظ أي نجاح وهمي. التفاصيل: ' + msg : msg; }
function check(error: any) { if (error)
    throw error; }
async function readCatalogTable(table:string,keys:string[]){const data:any[]=[];for(let offset=0;;offset+=1000){let query=supabase.from(table).select('*');for(const key of keys)query=query.order(key,{ascending:table==='homly_products'&&key==='created_at'?false:true});const response=await query.range(offset,offset+999);check(response.error);const page=response.data||[];data.push(...page);if(page.length<1000)break}return data}
export async function catalog(admin=false):Promise<Catalog>{
 requireConnection();const [products,categories,variants,images,links,options,values,choices]=await Promise.all([
 readCatalogTable('homly_products',['created_at','id']),readCatalogTable('homly_categories',['sort_order','id']),readCatalogTable('homly_product_variants',['sort_order','id']),readCatalogTable('homly_product_images',['sort_order','id']),readCatalogTable('homly_product_categories',['product_id','category_id']),readCatalogTable('homly_product_options',['id']),readCatalogTable('homly_option_values',['id']),readCatalogTable('homly_variant_option_values',['variant_id','option_id'])]);
 const group=(rows:any[],key:string)=>{const map=new Map<string,any[]>();for(const row of rows){const list=map.get(row[key]);if(list)list.push(row);else map.set(row[key],[row])}return map};
 const imagesByProduct=group(images.filter(i=>!i.variant_id),'product_id'),imagesByVariant=group(images.filter(i=>i.variant_id),'variant_id'),categoriesByProduct=group(links,'product_id'),variantsByProduct=group(variants,'product_id'),choicesByVariant=group(choices,'variant_id'),optionById=new Map(options.map(o=>[o.id,o])),valueById=new Map(values.map(v=>[v.id,v]));
 return {categories:categories.filter(c=>!c.deleted_at&&(admin||c.is_active)).map(c=>({...c,image_path:assetUrl(c.image_path)})),products:products.filter(p=>!p.deleted_at&&(admin||p.status==='published')).map(p=>({...p,categories:(categoriesByProduct.get(p.id)||[]).map(c=>c.category_id),images:(imagesByProduct.get(p.id)||[]).map(i=>assetUrl(i.storage_path)),variants:(variantsByProduct.get(p.id)||[]).filter(v=>admin||v.status==='published').map(v=>({...v,images:(imagesByVariant.get(v.id)||[]).map(i=>assetUrl(i.storage_path)),options:Object.fromEntries((choicesByVariant.get(v.id)||[]).map(c=>[optionById.get(c.option_id)?.name_ar||'الاختيار',valueById.get(c.value_id)?.label_ar||'']))}))}))};
}
export function assetUrl(path: string | null) { if (!path)
    return '/placeholder.svg'; if (path.startsWith('/') || /^https?:\/\//.test(path))
    return path; return supabase.storage.from('homly-products').getPublicUrl(path).data.publicUrl; }
export function cards(products: Product[]) { return products.flatMap(p => { const vs = p.variants.filter(v => v.status === 'published'); if (p.status !== 'published')
    return []; return (p.display_mode === 'separate_variants' ? vs.filter(v => v.is_listed) : [...vs].sort((a, b) => a.price_minor - b.price_minor).slice(0, 1)).map(v => ({ p, v })); }); }
export function imageFor(p: Product, v?: Variant) { return v?.images[0] || p.images[0] || '/placeholder.svg'; }
export async function shippingZones(includeInactive = false): Promise<Zone[]> { requireConnection(); let q = supabase.from('homly_shipping_zones').select('id,governorate,areas,fee_minor,is_active'); if (!includeInactive)
    q = q.eq('is_active', true); const { data, error } = await q; check(error); return data || []; }
export async function saveProduct(p: Product) { requireConnection(); const { data, error } = await supabase.rpc('homly_save_product', { payload: p }); check(error); if(typeof data!=='string'||!data)throw new Error('لم يصل معرف المنتج المحفوظ من قاعدة البيانات'); const saved=await supabase.from('homly_products').select('id').eq('id',data).single();check(saved.error);if(!saved.data?.id)throw new Error('تعذر التحقق من حفظ المنتج؛ حدّث القائمة قبل إعادة الحفظ'); return data; }
export async function saveCategory(c: Partial<Category>) { requireConnection(); const {data,error}=await supabase.from('homly_categories').upsert({ ...c,id:c.id||undefined }).select('id').single();check(error);if(!data?.id)throw new Error('لم يصل تأكيد حفظ القسم من قاعدة البيانات'); }
export async function uploadImage(file: File) { if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('الصورة يجب أن تكون JPG أو PNG أو WebP وبحد أقصى 5MB'); ; requireConnection(); const path = crypto.randomUUID() + '.' + file.type.split('/')[1]; const { error } = await supabase.storage.from('homly-products').upload(path, file, { upsert: false, contentType: file.type }); check(error); return assetUrl(path); }
export async function orders(): Promise<Order[]> { requireConnection(); const { data, error } = await supabase.from('homly_orders').select('*,homly_order_items(*),homly_order_status_history(*),homly_order_item_checks(*)').order('created_at', { ascending: false }); check(error); return (data || []).map(o => ({ ...o, items: (o.homly_order_items||[]).map((i:any)=>({...i,image_snapshot:assetUrl(i.image_snapshot)})), history: o.homly_order_status_history, checks: o.homly_order_item_checks || [] })); }
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
 try{response=await supabase.rpc('homly_checkout',{payload}).abortSignal(controller.signal)}catch{throw new Error('انقطع الاتصال قبل وصول تأكيد الطلب. أعد المحاولة بنفس البيانات لتجنب التكرار.')}finally{clearTimeout(timer)}
 const {data,error}=response;
 if(error)throw new Error(error.code==='PGRST202'?'خدمة تأكيد الطلب تحتاج تحديث SQL المرفق. لم يصل تأكيد حفظ؛ أعد المحاولة بعد تحديث القاعدة.':error.message);

 if(data?.error||!data?.id||!data?.code)throw new Error(data?.error||'لم يصل تأكيد موثوق من الخادم');
 return data;
}
export async function checkOrderItem(orderId: string, itemId: string, available: boolean) { requireConnection(); const { error } = await supabase.rpc('homly_check_order_item', { p_order_id: orderId, p_item_id: itemId, p_available: available }); check(error); }
export async function saveZone(zone: Partial<Zone>) { requireConnection(); const { error } = await supabase.rpc('homly_save_shipping_zone', { p_zone: zone }); check(error); }
export async function reorderCategories(ids: string[]) { requireConnection(); const { error } = await supabase.rpc('homly_reorder_categories', { p_ids: ids }); check(error); }

export async function removeCatalogItem(kind:'product'|'category',id:string){requireConnection();const {error}=await supabase.rpc('homly_remove_catalog_item',{p_kind:kind,p_id:id});check(error);window.dispatchEvent(new Event('homy-catalog-changed'))}
