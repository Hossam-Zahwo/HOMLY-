import {useEffect,useState} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight} from 'lucide-react';
import {useSite} from '@/lib/site';
import {safeHref,type HomeBlock} from '@/lib/content-model';
import {cards,type Product,type Variant} from '@/lib/commerce';
import {budgetProducts} from '@/lib/budget-products';
import {rotateHomeCards} from '@/lib/home-product-rotation';
import {useIsMobile} from '@/hooks/use-mobile';
import {useCatalog,Section,Picture,ProductCard,Notice,Loading,Empty,TrustStrip} from './StoreUI';
import {PublicReviews} from './Reviews';
/** Automatic homepage sections vary on each page visit; manual choices are fixed. */
function selection(b: HomeBlock, all: {p: Product; v: Variant}[], visitSeed: number) {
  const limit = Math.min(24, Math.max(1, b.limit));
  const available = all.filter(({v}) => v.stock_on_hand > v.stock_reserved);
  if (b.source === 'manual') {
    // An editor explicitly chose these products and their order: never rotate.
    return b.variantIds
      .map(id => available.find(({v}) => v.id === id))
      .filter((x): x is {p: Product; v: Variant} => Boolean(x))
      .slice(0, limit);
  }
  let rows = available.filter(({p,v}) =>
    b.source === 'category' ? p.categories.includes(b.categoryId) :
    b.source === 'offers' ? (v.compare_at_minor || 0) > v.price_minor : true
  );
  if (b.type === 'budget') rows = rows.filter(({v}) => v.price_minor <= b.maxPrice * 100);
  // Keep 'latest' sourced from recent catalog entries even while changing the mix.
  if (b.source === 'latest') rows = rows.slice(0, Math.max(limit * 3, limit));
  return rotateHomeCards(rows, visitSeed, b.id).slice(0, limit);
}
function Hero({block:b}:{block:HomeBlock}){const slides=b.slides.filter(s=>s.visible);const [active,setActive]=useState(0);useEffect(()=>{if(slides.length<2)return;const timer=window.setInterval(()=>setActive(i=>(i+1)%slides.length),4500);return ()=>window.clearInterval(timer)},[slides.length]);if(!slides.length)return null;return <section className="hero-trio" style={{gridTemplateColumns:`repeat(${Math.min(slides.length,4)},1fr)`}} onTouchStart={e=>{e.currentTarget.dataset.touch=String(e.touches[0].clientX)}} onTouchEnd={e=>{const delta=e.changedTouches[0].clientX-Number(e.currentTarget.dataset.touch);if(Math.abs(delta)>40)setActive(i=>(i+(delta>0?1:slides.length-1))%slides.length)}}>{slides.map((s,i)=><div className={'hero-panel '+(i===(active%slides.length)?'hero-active':'')} key={s.id}><picture>{s.mobileImage&&<source media="(max-width:767px)" srcSet={s.mobileImage}/>}<Picture src={s.image} alt={s.alt||s.title}/></picture>{i===Math.floor(slides.length/2)&&<div className="hero-headline"><h1>{b.title}</h1><p>{b.subtitle}</p></div>}<div className="hero-caption"><h2>{s.title}</h2><p>{s.subtitle}</p>{s.showButton&&<a className="btn" href={safeHref(s.href)}>{s.buttonLabel}<ArrowLeft size={16}/></a>}</div></div>)}<div className="hero-dots">{slides.map((s,i)=><button key={s.id} className={i===active%slides.length?'active':''} onClick={()=>setActive(i)} aria-label={'عرض '+s.title}/>)}</div></section>}
/** The budget section shows four products per slide on desktop, two on mobile. */
function BudgetSlider({block,products,loading,visitSeed}:{block:HomeBlock;products:Product[];loading:boolean;visitSeed:number}){
  const isMobile=useIsMobile();
  const itemsPerPage=isMobile?2:4;
  const [page,setPage]=useState(0);
  const items=rotateHomeCards(budgetProducts(products,block.maxPrice),visitSeed,block.id);
  const pages=Math.max(1,Math.ceil(items.length/itemsPerPage));
  const visiblePage=page%pages;
  const visible=items.slice(visiblePage*itemsPerPage,visiblePage*itemsPerPage+itemsPerPage);
  useEffect(()=>setPage(0),[isMobile,visitSeed]);
  const change=(step:number)=>setPage(current=>((current+step)%pages+pages)%pages);
  return <section className="budget-band" aria-label={block.title}>
    <div className="wrap budget-layout">
      <div className="budget-intro"><h2>{block.title}</h2><p>{block.subtitle}</p></div>
      <div className="budget-content">
        <div className="budget-topline">
          <a className="budget-view-all" href="/products?max=500" aria-label="عرض جميع المنتجات بسعر 500 جنيه أو أقل">عرض الكل <ArrowLeft size={17}/></a>
          {items.length>itemsPerPage&&<span className="budget-page-status" aria-live="polite">{visiblePage+1} / {pages}</span>}
        </div>
        <div className="budget-slider">
          {loading?<Loading/>:items.length?<div className="budget-products" aria-live="polite" aria-atomic="true">
            {visible.map(x=><ProductCard key={x.v.id} {...x}/>)}</div>:<Empty/>}
          {pages>1&&!loading&&<>
            <button className="budget-arrow budget-arrow-prev" type="button" onClick={()=>change(-1)} aria-label={isMobile?"عرض المنتجين السابقين":"عرض الأربعة منتجات السابقة"}><ChevronRight size={21}/></button>
            <button className="budget-arrow budget-arrow-next" type="button" onClick={()=>change(1)} aria-label={isMobile?"عرض المنتجين التاليين":"عرض الأربعة منتجات التالية"}><ChevronLeft size={21}/></button>
          </>}
        </div>
      </div>
    </div>
  </section>;
}
export function HomeContent(){const {config,loading:siteLoading,error:siteError}=useSite();const {products,categories,loading,error,reload}=useCatalog();const [waitForSite,setWaitForSite]=useState(true);const [visitSeed,setVisitSeed]=useState(0);useEffect(()=>{setVisitSeed(Math.floor(Math.random()*0x7fffffff)+1)},[]);useEffect(()=>{const timeout=window.setTimeout(()=>setWaitForSite(false),2000);return ()=>window.clearTimeout(timeout)},[]);const all=cards(products);if(siteLoading&&waitForSite)return <div className="homey-initial-loading" role="status" aria-label="جارٍ تحميل الصفحة الرئيسية"><span className="home-loading-spinner" aria-hidden="true"/></div>;if(!config.blocks.some(b=>b.visible))return <div className="wrap page home-unavailable"><h1>أهلاً بك في هومي</h1><p>{siteError||'الصفحة الرئيسية غير متاحة مؤقتًا. يمكنك تصفح منتجاتنا الآن.'}</p><a className="btn" href="/products">تصفح المنتجات</a><button className="btn outline" onClick={()=>window.location.reload()}>إعادة المحاولة</button></div>;return <>{error&&<div className="wrap"><Notice>{error}<button className="text-button" onClick={reload}>إعادة المحاولة</button></Notice></div>}{config.blocks.filter(b=>b.visible).map(b=>{const rows=selection(b,all,visitSeed);if(b.type==='hero')return <Hero key={b.id} block={b}/>;if(b.type==='reviews')return <PublicReviews key={b.id} title={b.title}/>;if(b.type==='features')return <section className="wrap section" key={b.id}><h2>{b.title}</h2><TrustStrip/></section>;if(b.type==='categories')return <Section key={b.id} title={b.title} to={safeHref(b.href)} showAction={b.showButton} actionLabel={b.buttonLabel}><p className="muted">{b.subtitle}</p><div className="room-grid">{categories.slice(0,b.limit).map(c=><a key={c.id} href={'/category/'+encodeURIComponent(c.slug)}><Picture src={c.image_path} alt={c.name_ar}/><span>{c.name_ar}<ArrowLeft size={18}/></span></a>)}</div></Section>;if(b.type==='text')return <section key={b.id} className={'cms-text wrap '+(b.image?'with-image':'')} style={b.image?{backgroundImage:`linear-gradient(to left,#f5f5efee,#f5f5ef77),url("${b.image.replace(/["\\\n\r]/g,'')}")`}:undefined}><div><h2>{b.title}</h2><p>{b.subtitle}</p><p className="preserve-lines">{b.body}</p>{b.showButton&&<a href={safeHref(b.href)} className="btn">{b.buttonLabel}</a>}</div></section>;if(b.type==='editorial')return <section key={b.id} className="comfort-grid wrap"><div className="editorial"><Picture src={b.image} alt={b.title}/><div><h2>{b.title}</h2><p>{b.subtitle}</p>{b.showButton&&<a href={safeHref(b.href)} className="btn">{b.buttonLabel}<ArrowLeft size={16}/></a>}</div></div><div className="product-grid mini">{rows.map(x=><ProductCard key={x.v.id} {...x}/>)}</div></section>;if(b.type==='budget')return <BudgetSlider key={b.id} block={b} products={products} loading={loading} visitSeed={visitSeed}/>;return <Section key={b.id} title={b.title} to={safeHref(b.href)} showAction={b.showButton} actionLabel={b.buttonLabel}><p className="muted">{b.subtitle}</p>{loading?<Loading/>:rows.length?<div className="product-grid">{rows.map(x=><ProductCard key={x.v.id} {...x}/>)}</div>:<Empty/>}</Section>})}</>}
