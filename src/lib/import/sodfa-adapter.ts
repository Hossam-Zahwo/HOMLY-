import type {Category} from '../commerce';
import type {RawRow,Issue} from './model';

/** Compatibility layer for SODFA warehouse exports; the strict native importer remains unchanged. */
export function adaptSodfaExport(rows:RawRow[], images:RawRow[], categories:Category[]) {
 const warnings:Issue[]=[];
 const warn=(r:RawRow,key:string,message:string)=>warnings.push({sheet:'البيانات',row:r.row,key,message});
 const known=new Map<string,string>();
 for(const c of categories){known.set(c.id.toLowerCase(),c.id);known.set(c.slug.toLowerCase(),c.id)}
 const fallback=categories[0]?.id;
 const usedSlugs=new Set<string>();
 const makeSlug=(key:string)=>'import-'+Array.from(new TextEncoder().encode(key)).map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,175);
 const result=rows.map(r=>({row:r.row,data:{...r.data}}));
 const roots=new Map<string,RawRow>();
 for(const r of result){
  const d=r.data,kind=String(d.record_type||'').trim();
  if(kind==='base'||kind==='simple')roots.set(String(d.item_key||''),r);
  if(kind!=='base'&&kind!=='simple'&&kind!=='variant')continue;
  if(kind==='base'||kind==='simple'){
   const refs=String(d.category_refs||'').split('|').map(s=>s.trim()).filter(Boolean);
   const matched=refs.map(ref=>known.get(ref.toLowerCase())).filter((x):x is string=>Boolean(x));
   if(!matched.length&&fallback){d.category_refs=fallback;warn(r,'category_refs','التصنيف غير متوافق؛ تم تعيين أول تصنيف متاح ويمكن تعديله لاحقًا');}
   else if(matched.length){d.category_refs=[...new Set(matched)].join('|');if(matched.length!==refs.length)warn(r,'category_refs','تم تجاهل التصنيفات غير المطابقة');}
   if(String(d.status||'')==='active'){d.status='draft';warn(r,'status','تم استيراد المنتج كمسودة للمراجعة قبل النشر');}
   if(!['draft','published'].includes(String(d.status||''))){d.status='draft';warn(r,'status','حالة غير متوافقة؛ استخدمت مسودة');}
   if(!['grouped','separate_variants'].includes(String(d.display_mode||''))){d.display_mode=kind==='base'?'separate_variants':'grouped';warn(r,'display_mode','تم استخدام طريقة العرض الافتراضية');}
  }
  if(kind==='simple'||kind==='variant'){
   const sku=String(d.sku||'').trim();if(!sku){d.sku=String(d.item_key||'').slice(0,100);warn(r,'sku','تم استخدام كود السجل كـ SKU');}
   let slug=String(d.slug||'').trim();
   if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)||usedSlugs.has(slug)){
    slug=makeSlug(String(d.item_key||''));let i=2;const base=slug;while(usedSlugs.has(slug))slug=base+'-'+i++;
    d.slug=slug;warn(r,'slug','تم إنشاء رابط متوافق تلقائيًا');
   }
   usedSlugs.add(slug);
   if(String(d.price_egp??'').trim()===''||Number(d.price_egp)<=0){d.price_egp=1;warn(r,'price_egp','السعر مفقود أو غير صالح؛ استخدم 1 جنيه مؤقتًا ويجب مراجعته');}
   if(!Number.isInteger(Number(d.stock_on_hand))||Number(d.stock_on_hand)<0){d.stock_on_hand=0;warn(r,'stock_on_hand','الكمية غير صالحة؛ استخدم صفرًا');}
   if(String(d.compare_at_egp||'')&&Number(d.compare_at_egp)<=Number(d.price_egp)){d.compare_at_egp='';warn(r,'compare_at_egp','تم تجاهل سعر المقارنة غير الصالح');}
   if(kind==='variant'&&!String(d.option_1_name||'').trim()&&!String(d.extra_options_json||'').trim()){d.option_1_name='التفريعة';d.option_1_value=String(d.title_override||d.sku||d.item_key);warn(r,'option_1_name','تم إنشاء اختيار تفريعة مؤقت');}
  }
  if(String(d.specifications_json||'')==='{}')d.specifications_json='';
 }
 // Normalize variants from the same family to the same option dimensions.
 const groups=new Map<string,typeof result>();
 for(const r of result)if(String(r.data.record_type)==='variant'){
  const parent=String(r.data.parent_key||'');const list=groups.get(parent)||[];list.push(r);groups.set(parent,list);
 }
 for(const family of groups.values()){
  const names=new Set<string>();for(const r of family)for(let i=1;i<=3;i++){const name=String(r.data[`option_${i}_name`]||'').trim();if(name)names.add(name)}
  if(names.size===1&&family.some(r=>!String(r.data.option_1_name||''))){const name=[...names][0];for(const r of family)if(!String(r.data.option_1_name||'')){r.data.option_1_name=name;r.data.option_1_value=String(r.data.title_override||r.data.sku||r.data.item_key)}}
 }
 // Exporters may number their primary image 1; native importer requires 0.
 const normalizedImages=images.map(r=>({row:r.row,data:{...r.data}}));
 const byItem=new Map<string,typeof normalizedImages>();
 for(const r of normalizedImages){const k=String(r.data.item_key||'');const list=byItem.get(k)||[];list.push(r);byItem.set(k,list)}
 for(const list of byItem.values()){
  list.sort((a,b)=>Number(a.data.sort_order||0)-Number(b.data.sort_order||0));
  list.forEach((r,i)=>{r.data.sort_order=i;r.data.is_primary=i===0});
 }
 return {rows:result,images:normalizedImages,warnings};
}
