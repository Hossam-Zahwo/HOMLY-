import {assetUrl} from './commerce';
import {configured, supabase} from './supabase';

export const HOMEY_ORIGIN = 'https://www.homeyegypt.com';
export const HOMEY_SITE_NAME = 'هومي مصر | HOMEY Egypt';

// A focused, relevant set of real product categories and Egyptian searches.
// These are supplementary terms; search engines primarily use visible content,
// page-specific titles/descriptions and structured product information.
export const homeKeywords = [
  'هومي مصر','هومي للأدوات المنزلية','HOMEY Egypt','أدوات منزلية','ادوات منزلية اون لاين',
  'مستلزمات البيت','مستلزمات المنزل','رفايع منزلية','رفايع البيت','أدوات المطبخ',
  'مستلزمات المطبخ','تنظيم المطبخ','منظمات المطبخ','تنظيم الأدراج',
  'منظم معالق','منظم ملاعق','منظم درج معالق','حامل معالق','حامل توابل',
  'برطمانات تخزين','علب مطبخ','علب حفظ الطعام','علب تخزين',
  'أدوات التقديم','ركن التقديم والمشروبات','أطباق تقديم','طبق تسالي',
  'أطباق تسالي','صواني تقديم','صينية تقديم','بولة تقديم','بُولات',
  'مجات','مج قهوة','أكواب','كوبايات','زجاجات مياه','شفاطات',
  'إكسسوارات المطبخ','أدوات تنظيف','العناية بالمنزل','تنظيف المنزل',
  'مكنسة كهربائية','فرش تنظيف','منظمات حمام','منظم حمام',
  'تنظيم الحمام','اكسسوارات الحمام','علبة مناديل','علب مناديل',
  'سلة غسيل','باسكت غسيل','منظم غسيل','منظمات تخزين',
  'تنظيم وتخزين','رفوف تنظيم','وحدات تخزين','ديكور منزلي',
  'ديكور البيت','مفروشات','إكسسوارات منزلية','ركن المكتب','منظم مكتب',
  'أدوات منزلية مصر','تسوق أدوات منزلية','تجهيز البيت','منظمات منزلية'
].join('، ');

export const homeDescription =
  'تسوق أدوات منزلية ورفايع البيت من هومي مصر HOMEY Egypt: أدوات المطبخ، تنظيم الأدراج والمعالق، التقديم والمشروبات، منظمات الحمام، التخزين، الديكور والمفروشات. اكتشف المنتجات والأسعار أونلاين.';

export type ProductSeo = {
  name:string;
  description:string;
  slug:string;
  sku:string;
  priceMinor:number;
  stock:number;
  image:string|null;
};

export const cleanDescription = (input:string) => (input||'')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();

export function productSeoTitle(p:ProductSeo) {
  return `${p.name} | هومي مصر HOMEY Egypt`;
}
export function productSeoDescription(p:ProductSeo) {
  const text=p.description || `${p.name} من هومي مصر. اكتشف الصور والمواصفات والسعر والتوفر واطلب أونلاين.`;
  return text.length>165?text.slice(0,162).replace(/\s+\S*$/,'')+'…':text;
}
export const productUrl = (slug:string) => `${HOMEY_ORIGIN}/product/${encodeURIComponent(slug)}`;

/** Lightweight public-only SEO read for TanStack Start's server-rendered <head>.
 * It does not change storefront data, queries or RLS policies. */
export async function fetchProductSeo(slug:string):Promise<ProductSeo|null>{
  if(!configured || !slug || slug.length>250)return null;
  try {
    const {data:v,error:ve}=await supabase.from('homly_product_variants')
      .select('id,product_id,slug,sku,title_override,description_override,price_minor,stock_on_hand,stock_reserved,status')
      .eq('slug',slug).eq('status','published').maybeSingle();
    if(ve||!v)return null;
    const {data:p,error:pe}=await supabase.from('homly_products')
      .select('id,title_ar,description,status,deleted_at').eq('id',v.product_id)
      .eq('status','published').maybeSingle();
    if(pe||!p||p.deleted_at)return null;
    const {data:images}=await supabase.from('homly_product_images')
      .select('variant_id,storage_path,sort_order').eq('product_id',p.id)
      .order('sort_order',{ascending:true});
    const imageRow=images?.find(i=>i.variant_id===v.id)||images?.find(i=>!i.variant_id);
    const name=(v.title_override||p.title_ar||'').trim();
    if(!name)return null;
    const priceMinor=Number(v.price_minor);
    if(!Number.isFinite(priceMinor)||priceMinor<=0)return null;
    return {
      name,slug:v.slug,sku:v.sku||'',priceMinor,
      stock:Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0)),
      description:cleanDescription(v.description_override||p.description||''),
      image:imageRow?.storage_path?new URL(assetUrl(imageRow.storage_path),HOMEY_ORIGIN).href:null
    };
  }catch{return null;}
}

/** Literal JSON in <script> must never contain an executable closing tag. */
export const safeStructuredData=(value:object)=>JSON.stringify(value).replace(/</g,'\\u003c');

export function productJsonLd(product:ProductSeo) {
  const url=productUrl(product.slug);
  return {
    '@context':'https://schema.org','@type':'Product','@id':url+'#product',
    name:product.name,url,
    ...(product.description?{description:product.description}:{}),
    ...(product.image?{image:[product.image]}:{}),
    ...(product.sku?{sku:product.sku}:{}),
    offers:{'@type':'Offer',url,
      price:(product.priceMinor/100).toFixed(2),priceCurrency:'EGP',
      availability:product.stock>0?'https://schema.org/InStock':'https://schema.org/OutOfStock',
      seller:{'@type':'Organization',name:'هومي مصر',url:HOMEY_ORIGIN}
    }
  };
}
