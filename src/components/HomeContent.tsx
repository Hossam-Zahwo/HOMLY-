import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight, MoveHorizontal, Sparkles} from 'lucide-react';
import {Link} from '@tanstack/react-router';
import {useSite} from '@/lib/site';
import {safeHref, type HomeBlock} from '@/lib/content-model';
import {cards, type Category, type Product, type Variant} from '@/lib/commerce';
import {budgetProducts} from '@/lib/budget-products';
import {rotateHomeCards} from '@/lib/home-product-rotation';
import {latinDigits} from '@/lib/digits';
import {useIsMobile} from '@/hooks/use-mobile';
import {assetUrl} from '@/lib/commerce';
import {supabaseResponsiveImage} from '@/lib/image-optimization';
import {useCatalog, Section, Picture, ProductCard, Notice, Loading, Empty} from './StoreUI';
import {PublicReviews} from './Reviews';
import {HomeyBenefits} from './HomeyBenefits';

type ProductItem = {p: Product; v: Variant};

/** Keep all manually chosen rows as authored. Give automatic storefront sections room to show more products. */
function selection(block: HomeBlock, all: ProductItem[], seed: number) {
  const limit = Math.min(24, Math.max(1, block.source === 'manual' ? block.limit : block.type === 'products' ? Math.max(8, block.limit) : block.type === 'editorial' ? Math.max(4, block.limit) : block.limit));
  const available = all.filter(({v}) => v.stock_on_hand > v.stock_reserved);
  if (block.source === 'manual') {
    return block.variantIds.map(id => available.find(({v}) => v.id === id)).filter((x): x is ProductItem => Boolean(x)).slice(0, limit);
  }
  let rows = available.filter(({p,v}) => block.source === 'category'
    ? p.categories.includes(block.categoryId)
    : block.source === 'offers' ? (v.compare_at_minor || 0) > v.price_minor : true);
  if (block.type === 'budget') rows = rows.filter(({v}) => v.price_minor <= block.maxPrice * 100);
  if (block.source === 'latest') rows = rows.slice(0, Math.max(limit * 3, limit));
  return rotateHomeCards(rows, seed, block.id).slice(0, limit);
}

function Hero({block}: {block: HomeBlock}) {
  const slides = block.slides.filter(slide => slide.visible);
  const [active,setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  useEffect(() => {
    if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const interval = window.setInterval(() => setActive(current => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(interval);
  }, [slides.length]);
  if (!slides.length) return null;
  const activeIndex = active % slides.length;
  return <section className="homey-new-hero wrap" aria-label={latinDigits(block.title)}
    onTouchStart={event => {touchStart.current = event.touches[0]?.clientX ?? null;}}
    onTouchEnd={event => {
      if (touchStart.current === null) return;
      const delta = event.changedTouches[0].clientX - touchStart.current;
      touchStart.current = null;
      if (Math.abs(delta) > 45) setActive(current => (current + (delta > 0 ? 1 : slides.length - 1)) % slides.length);
    }}>
    <div className="homey-new-hero-stage">
      {slides.map((slide,index) => <article key={slide.id} className={'homey-new-hero-slide' + (index === activeIndex ? ' is-current' : '') + (index === 0 && /^\/images\/(kitchen|living|storage)\.png$/.test(slide.image) ? ' homey-first-visual' : '')} aria-hidden={index !== activeIndex}>
        <div className="homey-new-hero-picture">{index === activeIndex && !(index === 0 && /^\/images\/(kitchen|living|storage)\.png$/.test(slide.image)) &&
          <picture>{slide.mobileImage && <source media="(max-width:767px)" srcSet={supabaseResponsiveImage(assetUrl(slide.mobileImage), 960)}/>}
            <Picture priority={true} kind="hero" src={slide.image} alt={latinDigits(slide.alt || slide.title)}/>
          </picture>}
        </div>
        <div className="homey-new-hero-content">
          <span className="homey-hero-kicker"><Sparkles size={14}/> {latinDigits(slide.title)}</span>
          <h1>{latinDigits(block.title)}</h1>
          <p>{latinDigits(block.subtitle || slide.subtitle)}</p>
          {(slide.showButton || block.showButton) && <a tabIndex={index === activeIndex ? 0 : -1} className="btn homey-hero-cta" href={safeHref(slide.showButton ? slide.href : block.href)}>{latinDigits(slide.showButton ? slide.buttonLabel : block.buttonLabel)} <ArrowLeft size={17}/></a>}
        </div>
      </article>)}
    </div>
    {slides.length > 1 && <div className="homey-hero-dots" aria-label="شرائح العروض">{slides.map((slide,index) => <button type="button" key={slide.id} aria-label={'عرض '+latinDigits(slide.title)} aria-current={index === activeIndex ? 'true' : undefined} className={index === activeIndex ? 'active' : ''} onClick={() => setActive(index)}/>)}</div>}
  </section>;
}

/** One compact image-led category discovery strip, directly beneath the hero. */
function CategoryDiscovery({categories}: {categories: Category[]}) {
  if (!categories.length) return null;
  return <section className="wrap section homey-category-discovery" aria-label="تسوق حسب القسم">
    <div className="homey-discovery-heading">
      <div className="homey-discovery-title">
        <span className="homey-section-kicker">اختار القسم اللي يناسبك</span>
        <h2>بتدوّر على إيه؟</h2>
      </div>
      <Link to="/categories" className="homey-discovery-all">كل الأقسام <ArrowLeft size={16}/></Link>
    </div>
    <div className="homey-category-rail" aria-label="أقسام هومي - اسحب لعرض المزيد">
      {categories.map((cat,index) => <Link to="/category/$slug" params={{slug:cat.slug}} key={cat.id} className="homey-category-tile">
        <div className="homey-category-image"><Picture kind="category" src={cat.image_path} alt={latinDigits(cat.name_ar)}/></div>
        <span>{latinDigits(cat.name_ar)}</span>
      </Link>)}
    </div>
    {categories.length > 2 && <span className="homey-swipe-hint"><MoveHorizontal size={16}/> اسحب وشوف باقي الأقسام</span>}
  </section>;
}

/** Desktop gets manual next/previous; mobile gets genuine finger-scrolling with snap, no arrows. */
function BudgetSlider({block,products,loading,visitSeed}: {block: HomeBlock; products: Product[]; loading: boolean; visitSeed: number}) {
  const isMobile = useIsMobile();
  const [page,setPage] = useState(0);
  const items = useMemo(() => rotateHomeCards(budgetProducts(products,block.maxPrice),visitSeed,block.id), [products,visitSeed,block.id,block.maxPrice]);
  const pages = Math.max(1,Math.ceil(items.length / 4));
  const visiblePage = page % pages;
  const visible = isMobile ? items.slice(0,24) : items.slice(visiblePage * 4, visiblePage * 4 + 4);
  useEffect(() => setPage(0), [isMobile,visitSeed]);
  const change = (step: number) => setPage(current => ((current + step) % pages + pages) % pages);
  return <section className="budget-band homey-budget-section" aria-label={latinDigits(block.title)}>
    <div className="wrap budget-layout"><div className="budget-intro"><span className="homey-section-kicker">اختيارات على قد الميزانية</span><h2>{latinDigits(block.title)}</h2><p>{latinDigits(block.subtitle)}</p></div>
      <div className="budget-content"><div className="budget-topline"><Link className="budget-view-all" to="/products" search={{max:block.maxPrice}}>عرض الكل <ArrowLeft size={17}/></Link>{isMobile ? <span className="homey-swipe-hint"><MoveHorizontal size={16}/> اسحب للمنتجات</span> : pages > 1 && <span className="budget-page-status" dir="ltr">{visiblePage+1} / {pages}</span>}</div>
        <div className="budget-slider">{loading ? <Loading/> : items.length ? <div className="budget-products" aria-label="منتجات تقدر تسحبها على الموبايل">{visible.map(item => <ProductCard key={item.v.id} {...item}/>)}</div> : <Empty/>}
          {!isMobile && pages > 1 && !loading && <><button className="budget-arrow budget-arrow-prev" type="button" onClick={() => change(-1)} aria-label="المنتجات السابقة"><ChevronRight size={21}/></button><button className="budget-arrow budget-arrow-next" type="button" onClick={() => change(1)} aria-label="المنتجات التالية"><ChevronLeft size={21}/></button></>}</div>
      </div></div>
  </section>;
}

function MoreProducts({items}: {items: ProductItem[]}) {
  const [count,setCount] = useState(8);
  const trigger = useRef<HTMLDivElement | null>(null);
  useEffect(() => {setCount(8)}, [items]);
  useEffect(() => {
    const el = trigger.current;
    if (!el || count >= items.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {if (entries[0]?.isIntersecting) setCount(current => Math.min(current + 8,items.length));}, {rootMargin:'90px 0px',threshold:0.1});
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, items.length]);
  if (!items.length) return null;
  return <section className="wrap section homey-more-products">
    <div className="section-head"><div><span className="homey-section-kicker">لسه فيه حاجات كتير</span><h2>اكتشف منتجات أكتر</h2></div><Link to="/products" className="homey-all-link">كل المنتجات <ArrowLeft size={17}/></Link></div>
    <div className="product-grid">{items.slice(0,count).map(item => <ProductCard {...item} key={item.v.id}/>)}</div>
    {count < items.length && <div className="homey-more-bottom"><button type="button" className="btn outline" onClick={() => setCount(current => Math.min(current + 8, items.length))}>عرض منتجات أكتر <ArrowLeft size={15}/></button><div ref={trigger} aria-hidden="true" className="homey-scroll-sentinel"/></div>}
  </section>;
}

export function HomeContent() {
  const {config,loading:siteLoading,error:siteError} = useSite();
  const {products,categories,loading,error,reload} = useCatalog();
  const [visitSeed,setVisitSeed] = useState(0);
  useEffect(() => setVisitSeed(Math.floor(Math.random()*0x7fffffff)+1), []);
  const all = useMemo(() => cards(products), [products]);
  const ready = useMemo(() => all.filter(({v}) => v.stock_on_hand > v.stock_reserved), [all]);
  const homeItems = useMemo(() => rotateHomeCards(ready,visitSeed,'homey-first-products'), [ready,visitSeed]);
  const visibleBlocks = config.blocks.filter(b=>b.visible);
  const hero = visibleBlocks.find(b=>b.type==='hero');
  const rest = visibleBlocks.filter(b=>b.type!=='hero');
  const categorySections = categories.map(cat=>({cat,items:ready.filter(({p})=>p.categories.includes(cat.id))})).filter(row=>row.items.length >= 2).slice(0,3);
  const firstProducts = homeItems.slice(0,8);
  const usedIds = new Set(firstProducts.map(({v})=>v.id));
  const remaining = homeItems.filter(({v})=>!usedIds.has(v.id));
  if (siteLoading) return <div className="wrap homey-first-skeleton" role="status" aria-label="جارٍ تجهيز منتجات هومي"><div className="homey-hero-placeholder skeleton"/><div className="product-grid"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div></div>;
  if (!visibleBlocks.length) return <div className="wrap page home-unavailable"><h1>أهلًا بيك في هومي</h1><p>{siteError||'تقدر تتصفح كل منتجاتنا هنا.'}</p><Link to="/products" className="btn">تصفح المنتجات</Link></div>;
  return <div className="homey-redesigned-home">
    {error && <div className="wrap"><Notice>{error}<button className="text-button" onClick={reload}>إعادة المحاولة</button></Notice></div>}
    {hero && <Hero block={hero}/>}
    <CategoryDiscovery categories={categories}/>
    <Section title="اختيارات هومي ليك" to="/products"><p className="homey-section-description">حاجات عملية ولطيفة لبيتك، شوف اللي يعجبك.</p>{loading ? <Loading/> : firstProducts.length ? <div className="product-grid homey-first-products">{firstProducts.map(item=><ProductCard key={item.v.id} {...item}/>)}</div> : <Empty/>}</Section>
    {rest.map(block => {
      const rows = selection(block,all,visitSeed);
      if (block.type==='reviews') return <PublicReviews key={block.id} title={latinDigits(block.title)}/>;
      if (block.type==='features') return <HomeyBenefits key={block.id} title={block.title}/>;
      if (block.type==='categories') return null; // Already rendered the complete, swipeable category row above.
      if (block.type==='text') return <section key={block.id} className={'cms-text wrap homey-warm-story '+(block.image?'with-image':'')} style={block.image?{backgroundImage:`linear-gradient(to left,#fff4ebe8,#fff4eb80),url("${block.image.replace(/["\\\n\r]/g,'')}")`}:undefined}><div><h2>{latinDigits(block.title)}</h2><p>{latinDigits(block.subtitle)}</p><p className="preserve-lines">{latinDigits(block.body)}</p>{block.showButton && <a href={safeHref(block.href)} className="btn">{latinDigits(block.buttonLabel)}</a>}</div></section>;
      if (block.type==='editorial') return <section key={block.id} className="comfort-grid wrap"><div className="editorial"><Picture kind="hero" src={block.image} alt={block.title}/><div><h2>{latinDigits(block.title)}</h2><p>{latinDigits(block.subtitle)}</p>{block.showButton && <a href={safeHref(block.href)} className="btn">{latinDigits(block.buttonLabel)} <ArrowLeft size={16}/></a>}</div></div><div className="product-grid mini">{rows.map(item=><ProductCard key={item.v.id} {...item}/>)}</div></section>;
      if (block.type==='budget') return <BudgetSlider key={block.id} block={block} products={products} loading={loading} visitSeed={visitSeed}/>;
      return <Section key={block.id} title={latinDigits(block.title)} to={safeHref(block.href)} showAction={block.showButton} actionLabel={latinDigits(block.buttonLabel)}><p className="homey-section-description">{latinDigits(block.subtitle)}</p>{loading ? <Loading/> : rows.length ? <div className="product-grid">{rows.map(item=><ProductCard key={item.v.id} {...item}/>)}</div> : <Empty/>}</Section>;
    })}
    {categorySections.map(({cat,items}) => <Section key={'homey-spotlight-'+cat.id} title={latinDigits(cat.name_ar)} to={'/category/'+encodeURIComponent(cat.slug)}><div className="product-grid">{items.slice(0,4).map(item=><ProductCard key={item.v.id} {...item}/>)}</div></Section>)}
    <MoreProducts items={remaining}/>
    <div className="wrap homey-final-explore"><Sparkles size={22}/><div><h2>لسه بتدوّر على حاجة؟</h2><p>شوف كل منتجات هومي واختار اللي يناسب بيتك.</p></div><Link to="/products" className="btn">تصفح كل المنتجات <ArrowLeft size={17}/></Link></div>
  </div>;
}
