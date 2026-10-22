import { Link, useLocation } from '@tanstack/react-router';
import { Menu, ShoppingCart, Search, X, ArrowLeft, Truck, ShieldCheck, PackageCheck, Minus, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { catalog, explain, money, imageFor, assetUrl, type Catalog, type Product, type Variant } from '@/lib/commerce';
import { useCart } from '@/lib/cart';
import { configured } from '@/lib/supabase';
import { useSite, useCopy } from '@/lib/site';
import { safeHref, whatsappHref } from '@/lib/content-model';
import { toast } from 'sonner';
export function Logo() { const { config } = useSite(); return <Link to="/" className="logo" aria-label={config.brand.name + ' الرئيسية'}>{config.brand.logo ? <img src={assetUrl(config.brand.logo)} alt={config.brand.name} style={{width:"auto",height:"auto",maxHeight:64,maxWidth:190,objectFit:"contain"}}/> : <><b>{config.brand.name}</b><small>{config.brand.latin}</small></>}</Link>; }
export function Picture({ src, alt = '', className = '' }: {
    src?: string;
    alt?: string;
    className?: string;
}) { return <img src={assetUrl(src || '')} alt={alt} className={className} loading="lazy" decoding="async" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }}/>; }
export function ModeNotice() { return !configured ? <div className="mode-notice warning">لم تُضف إعدادات Supabase بعد. أضفها إلى .env.local لعرض البيانات وحفظها.</div> : null; }
export function useCatalog(admin = false) { const [data, setData] = useState<Catalog>({ products: [], categories: [] }); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [version, setVersion] = useState(0); useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('homy-catalog-changed',refresh);window.addEventListener('focus',refresh);const visible=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener('homy-catalog-changed',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)}},[]); useEffect(() => { let live = true; setLoading(true); catalog(admin).then(d => { if (live) {
    setData(d);
    setError('');
} }).catch(e => { if (live) {setData({products:[],categories:[]});setError(explain(e));} }).finally(() => { if (live)
    setLoading(false); }); return () => { live = false; }; }, [admin, version]); return { ...data, loading, error, reload: () => setVersion(v => v + 1) }; }
export function Notice({ children, kind = 'error' }: {
    children: ReactNode;
    kind?: string;
}) { return <div role={kind === 'error' ? 'alert' : 'status'} className={'notice ' + kind}>{children}</div>; }
export function Loading() { return <div className="product-grid">{Array.from({ length: 4 }, (_, i) => <div className="skeleton" key={i}/>)}</div>; }
export function Empty({ text }: {
    text?: string;
}) { const copy = useCopy(); return <div className="empty"><PackageCheck /><p>{text || copy('emptyProducts', 'لا توجد منتجات منشورة في هذا القسم بعد.')}</p><Link to="/products" className="btn outline">استكشف المنتجات</Link></div>; }
export function Header() { const { categories } = useCatalog(); const { config, preview, error } = useSite(); const { lines } = useCart(); const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const location = useLocation(); useEffect(() => setOpen(false), [location.pathname]); const cats = categories.length ? categories : ([]); return <>{config.header.announcement && <div className="announcement">{config.header.announcement}</div>}<header className="store-header"><div className="header-main wrap"><button className="icon-button mobile-menu" aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><Logo />{config.header.showSearch && <form className="search" action="/products"><Search size={18}/><input name="q" aria-label="ابحث عن منتج" placeholder={config.header.searchPlaceholder} value={q} onChange={e => setQ(e.target.value)}/></form>}<div className="header-actions">{config.header.showOrders && <Link to="/orders" className="account-link">طلباتي</Link>}<Link to="/cart" search={{ checkout: false }} className="cart-link" aria-label="سلة التسوق"><ShoppingCart size={24}/><span>{lines.reduce((n, l) => n + l.quantity, 0)}</span></Link></div></div><nav className={'store-nav ' + (open ? 'is-open' : '')} aria-label="أقسام المتجر">{config.header.links.filter(l => l.visible).map(l => <a href={safeHref(l.href)} key={l.id}>{l.label}</a>)}{config.header.showCategories && cats.map(c => <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }}>{c.name_ar}</Link>)}</nav></header><ModeNotice />{preview && <div className="mode-notice">معاينة مسودة للإدارة فقط — المحتوى ده لسه مش منشور للعملاء.</div>}{error && <div className="mode-notice warning">{error}</div>}</>; }
export function Footer() { const { config } = useSite(); const wa = config.whatsapp.enabled ? whatsappHref(config.whatsapp.number, 'أهلًا، محتاج مساعدة من ' + config.brand.name) : ''; return <><footer className="store-footer"><div className="wrap footer-grid"><div><Logo /><p className="preserve-lines">{config.footer.description}</p></div>{config.footer.columns.map(c => <div key={c.id}><h3>{c.title}</h3>{c.links.filter(l => l.visible).map(l => <a href={safeHref(l.href)} key={l.id}>{l.label}</a>)}</div>)}{config.footer.socials.some(l => l.visible) && <div><h3>تابعنا</h3>{config.footer.socials.filter(l => l.visible).map(l => <a key={l.id} href={safeHref(l.href)} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</div>}</div><div className="footer-bottom">© {new Date().getFullYear()} — {config.footer.copyright}</div></footer>{wa && config.whatsapp.showFloating && <a className="floating-whatsapp" href={wa} target="_blank" rel="noopener noreferrer" aria-label="التواصل عبر واتساب">واتساب</a>}</>; }
export function Section({ title, to = '/products', children, showAction = true, actionLabel = 'عرض الكل' }: {
    title: string;
    to?: string;
    children: ReactNode;
    showAction?: boolean;
    actionLabel?: string;
}) { return <section className="wrap section"><div className="section-head"><h2>{title}</h2>{showAction && <a href={safeHref(to)}>{actionLabel} <ArrowLeft size={15}/></a>}</div>{children}</section>; }
export function Quantity({ value, onChange, max = 999 }: {
    value: number;
    onChange: (n: number) => void;
    max?: number;
}) { return <div className="quantity"><button aria-label="تقليل الكمية" disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={15}/></button><span>{value}</span><button aria-label="زيادة الكمية" disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={15}/></button></div>; }
export function ProductCard({ p, v }: {
    p: Product;
    v: Variant;
}) { const copy = useCopy(); const { add } = useCart(); const stock = v.stock_on_hand - v.stock_reserved; return <article className="product-card"><Link to="/product/$slug" params={{ slug: v.slug }} className="product-photo"><Picture src={imageFor(p, v)} alt={v.title_override || p.title_ar}/>{v.compare_at_minor && v.compare_at_minor > v.price_minor ? <span className="discount">عرض خاص</span> : null}</Link><div className="product-copy"><Link to="/product/$slug" params={{ slug: v.slug }}><h3>{v.title_override || p.title_ar}</h3></Link>{Object.values(v.options).length > 0 && <p className="muted options-copy">{Object.values(v.options).join(' / ')}</p>}<div className="price-row"><strong>{money(v.price_minor)}</strong>{v.compare_at_minor && v.compare_at_minor > v.price_minor ? <del>{money(v.compare_at_minor)}</del> : null}</div><button disabled={stock < 1} className="btn compact" onClick={() => { add(v.id); toast.success('تمت الإضافة للسلة'); }}><ShoppingCart size={16}/>{stock > 0 ? copy('productAdd', 'أضف للسلة') : copy('outOfStock', 'غير متوفر')}</button></div></article>; }
export function TrustStrip() { const copy = useCopy(); return <div className="trust-strip wrap"><div><Truck /><span>{copy('trustShipping')}<small>{copy('shippingNote')}</small></span></div><div><ShieldCheck /><span>{copy('trustQuality')}<small>وصف ومواصفات لكل منتج</small></span></div><div><PackageCheck /><span>{copy('trustOrders')}<small>حالة الطلب وتفاصيل القطع</small></span></div></div>; }
