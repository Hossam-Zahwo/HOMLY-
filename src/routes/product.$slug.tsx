import {createFileRoute,Link,useNavigate} from '@tanstack/react-router';
import {useEffect,useState} from 'react';
import {ShoppingCart,Check,ChevronLeft,ChevronRight} from 'lucide-react';
import {toast} from 'sonner';
import {useCatalog,Picture,Notice,Loading,ProductCard,Section,Quantity,TrustStrip} from '@/components/StoreUI';
import {imageFor,money,cards} from '@/lib/commerce';
import {PublicReviews} from '@/components/Reviews';
import {useCopy} from '@/lib/site';
import {useCart} from '@/lib/cart';
import {fetchProductSeo,productJsonLd,productSeoTitle,productSeoDescription,productUrl,safeStructuredData} from '@/lib/seo';
export const Route=createFileRoute('/product/$slug')({
  loader:({params})=>fetchProductSeo(params.slug),
  head:({loaderData,params})=>{
    const product=loaderData;
    const url=productUrl(params.slug);
    const title=product?productSeoTitle(product):'منتجات هومي مصر | أدوات منزلية ومستلزمات البيت';
    const description=product?productSeoDescription(product):'تصفح الأدوات المنزلية ومستلزمات البيت من هومي مصر.';
    return {
      meta:[
        {title},
        {name:'description',content:description},
        ...(product?[{name:'keywords',content:[product.name,product.name+' مصر','شراء '+product.name,'هومي مصر','أدوات منزلية'].join('، ')}]:[]),
        {property:'og:type',content:product?'product':'website'},
        {property:'og:title',content:title},
        {property:'og:description',content:description},
        {property:'og:url',content:url},
        ...(product?.image?[{property:'og:image',content:product.image},{name:'twitter:card',content:'summary_large_image'},{name:'twitter:image',content:product.image}]:[]),
        {name:'twitter:title',content:title},
        {name:'twitter:description',content:description}
      ],
      links:[{rel:'canonical',href:url}],
      scripts:product?[{type:'application/ld+json',children:safeStructuredData(productJsonLd(product))}]:[]
    };
  },
  component:ProductPage
});
function ProductPage() {
  const copy = useCopy();
  const { slug } = Route.useParams();
  const { products, loading, error } = useCatalog();
  const p = products.find((product) => product.variants.some((variant) => variant.slug === slug));
  const v = p?.variants.find((variant) => variant.slug === slug);
  const { add } = useCart();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');

  useEffect(() => {
    setPhoto(0);
    setQty(1);
  }, [slug]);

  if (error) return <div className="wrap page"><Notice>{error}</Notice></div>;
  if (loading) return <div className="wrap page"><Loading /></div>;
  if (!p || !v) return <div className="wrap empty"><h1>المنتج غير متاح</h1><Link to="/products" className="btn">عودة للمنتجات</Link></div>;

  const title = v.title_override || p.title_ar;
  const gallery = v.images.length ? v.images : p.images;
  const currentPhoto = Math.min(photo, Math.max(0, gallery.length - 1));
  const available = v.stock_on_hand - v.stock_reserved;
  const related = cards(products.filter((product) => product.id !== p.id && product.categories.some((id) => p.categories.includes(id)))).slice(0, 4);
  const addItem = () => {
    if (available < qty) return;
    add(v.id, qty);
    toast.success('تمت إضافة اختيارك إلى السلة');
  };

  return <>
    <div className="wrap page product-page">
      <div className="breadcrumb"><Link to="/">الرئيسية</Link> / <Link to="/products">المنتجات</Link> / {p.title_ar}</div>
      <div className="product-detail">
        <div className="product-gallery" aria-label="صور المنتج">
          <div className="gallery-main">
            <Picture src={gallery[currentPhoto] || imageFor(p, v)} alt={title} className="product-gallery-image" />
            {gallery.length > 1 && <>
              <button type="button" className="gallery-prev icon-button" aria-label="الصورة السابقة" onClick={() => setPhoto((currentPhoto - 1 + gallery.length) % gallery.length)}><ChevronRight /></button>
              <button type="button" className="gallery-next icon-button" aria-label="الصورة التالية" onClick={() => setPhoto((currentPhoto + 1) % gallery.length)}><ChevronLeft /></button>
              <span className="gallery-counter" aria-label={`الصورة ${currentPhoto + 1} من ${gallery.length}`} dir="ltr">{currentPhoto + 1} / {gallery.length}</span>
            </>}
          </div>
          {gallery.length > 1 && <div className="thumbnails" aria-label="اختيار صورة المنتج">
            {gallery.map((src, i) => <button type="button" className={currentPhoto === i ? 'selected' : ''} key={src + i} onClick={() => setPhoto(i)} aria-label={'صورة ' + (i + 1)} aria-pressed={currentPhoto === i}><Picture src={src} alt="" /></button>)}
          </div>}
        </div>
        <div className="product-info">
          <span className="eyebrow">اختيارات هومي</span>
          <h1>{title}</h1>
          {Object.values(v.options).length > 0 && <p className="muted">{Object.values(v.options).join(' / ')}</p>}
          <div className="detail-price"><strong>{money(v.price_minor)}</strong>{v.compare_at_minor && v.compare_at_minor > v.price_minor ? <del>{money(v.compare_at_minor)}</del> : null}</div>
          <p className="stock-label">{available > 0 ? '● ' + copy('inStock') : copy('outOfStock')}</p>
          <p className="description">{v.description_override || p.description}</p>
          {p.kind === 'variable' && <div className="variant-section">
            <h3>{copy('productChoices')}</h3>
            <div className="variant-choices">{p.variants.map((choice) => <Link key={choice.id} to="/product/$slug" params={{ slug: choice.slug }} className={'variant-choice ' + (choice.id === v.id ? 'selected' : '')}>
              <Picture src={imageFor(p, choice)} alt="" />
              <span>{Object.values(choice.options).join(' / ') || choice.title_override || choice.sku}<small>{money(choice.price_minor)}{choice.stock_on_hand <= choice.stock_reserved ? ' — غير متوفر' : ''}</small></span>
              {choice.id === v.id && <Check size={17} />}
            </Link>)}</div>
          </div>}
          <p className="muted sku">رمز المنتج: <span dir="ltr">{v.sku}</span></p>
          <div className="buy-actions"><Quantity value={qty} max={Math.max(1, available)} onChange={setQty} /><button className="btn" disabled={available < qty} onClick={addItem}><ShoppingCart size={19} />{copy('productAdd')}</button></div>
          <button className="btn outline buy-now" disabled={available < qty} onClick={() => { addItem(); void navigate({ to: '/cart', search: { checkout: true } }); }}>{copy('productBuy')}</button>
          <p className="muted small">تكلفة الشحن تظهر بعد اختيار منطقة التوصيل في السلة.</p>
        </div>
      </div>
      <section className="product-tabs">
        <div className="tabs"><button className={tab === 'description' ? 'active' : ''} onClick={() => setTab('description')}>{copy('productDescription')}</button><button className={tab === 'specs' ? 'active' : ''} onClick={() => setTab('specs')}>{copy('productSpecs')}</button></div>
        {tab === 'description' ? <p className="description">{v.description_override || p.description || 'الوصف قيد الإضافة.'}</p> : <dl>{Object.entries({ ...((p.specifications && typeof p.specifications === 'object' && !Array.isArray(p.specifications)) ? p.specifications : {}), ...v.options }).map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>}
      </section>
      {p.variants.length > 1 && <section className="section"><h2>{copy('sameGroup')}</h2><div className="product-grid">{p.variants.filter((x) => x.id !== v.id).map((x) => <ProductCard p={p} v={x} key={x.id} />)}</div></section>}
    </div>
    {related.length > 0 && <Section title={copy('related')}><div className="product-grid">{related.map((x) => <ProductCard key={x.v.id} {...x} />)}</div></Section>}
    <PublicReviews productId={p.id} title={copy('reviewsTitle')} />
    <TrustStrip />
    <div className="mobile-buy-bar"><strong>{money(v.price_minor)}</strong><button disabled={available < qty} className="btn" onClick={addItem}>{copy('productAdd')}</button></div>
  </>;
}
