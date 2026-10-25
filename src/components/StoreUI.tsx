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
export function Footer() { const { config } = useSite(); const wa = config.whatsapp.enabled ? whatsappHref(config.whatsapp.number, 'أهلًا، محتاج مساعدة من ' + config.brand.name) : ''; const socialLinks=[{label:'إنستجرام',url:'https://www.instagram.com/homeyegypt.ecom/',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none"/></svg>},{label:'فيسبوك',url:'https://www.facebook.com/share/1EAXrafo9m/',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.25.2 2.25.2v2.47H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"/></svg>}]; return <><footer className="store-footer"><div className="wrap footer-grid"><div><Logo /><p className="preserve-lines">{config.footer.description}</p></div>{config.footer.columns.map(c => <div key={c.id}><h3>{c.title}</h3>{c.links.filter(l => l.visible).map(l => <a href={safeHref(l.href)} key={l.id}>{l.label}</a>)}</div>)}<div><h3>تابعنا</h3><div className="homey-social-icons">{socialLinks.map(l=><a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label}>{l.icon}</a>)}</div><a className="homey-policy-link" href="/page/returns-policy">سياسة الاسترجاع والاستبدال</a></div></div><div className="footer-bottom">© {new Date().getFullYear()} — {config.footer.copyright}</div></footer>{wa && config.whatsapp.showFloating && <a className="floating-whatsapp homey-whatsapp-icon" href={wa} target="_blank" rel="noopener noreferrer" aria-label="التواصل عبر واتساب" title="تواصل معنا على واتساب"><svg width="29" height="29" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 .8A15.1 15.1 0 0 0 3 23.6L.9 31l7.6-2A15.2 15.2 0 1 0 16 .8Zm0 27.6a12.3 12.3 0 0 1-6.3-1.7l-.5-.3-4.5 1.2 1.2-4.4-.3-.5A12.3 12.3 0 1 1 16 28.4Zm6.8-9.2c-.4-.2-2.2-1.1-2.5-1.2-.3-.1-.5-.2-.7.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7.4-.6c.1-.2.1-.5 0-.7l-1.1-2.6c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.8c.2.2 2.6 4 6.3 5.5.9.4 1.6.6 2.2.7.9.3 1.8.2 2.5.1.8-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.2-.3-.3-.7-.5Z"/></svg></a>}</>; }
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
}) {
    const copy = useCopy();
    const { add } = useCart();
    const stock = v.stock_on_hand - v.stock_reserved;
    const title = v.title_override || p.title_ar;
    const options = Object.values(v.options).filter(Boolean).join(' / ');
    const hasDiscount = Boolean(v.compare_at_minor && v.compare_at_minor > v.price_minor);
    return <article className="product-card">
        <Link to="/product/$slug" params={{ slug: v.slug }} className="product-photo" aria-label={title}>
            <Picture src={imageFor(p, v)} alt={title}/>
            {hasDiscount ? <span className="discount">عرض خاص</span> : null}
        </Link>
        <div className="product-copy">
            <Link to="/product/$slug" params={{ slug: v.slug }} className="product-card-title-link" title={title}>
                <h3>{title}</h3>
            </Link>
            <p className="muted options-copy" title={options || undefined} aria-hidden={!options}>{options || '\u00a0'}</p>
            <div className="price-row">
                <strong>{money(v.price_minor)}</strong>
                {hasDiscount && v.compare_at_minor ? <del>{money(v.compare_at_minor)}</del> : null}
            </div>
            <button disabled={stock < 1} className="btn compact" onClick={() => {
                add(v.id);
                toast.success('تمت الإضافة للسلة');
            }}><ShoppingCart size={16}/>{stock > 0 ? copy('productAdd', 'أضف للسلة') : copy('outOfStock', 'غير متوفر')}</button>
        </div>
    </article>;
}
export function TrustStrip() { const copy = useCopy(); return <div className="trust-strip wrap"><div><Truck /><span>{copy('trustShipping')}<small>{copy('shippingNote')}</small></span></div><div><ShieldCheck /><span>{copy('trustQuality')}<small>وصف ومواصفات لكل منتج</small></span></div><div><PackageCheck /><span>{copy('trustOrders')}<small>حالة الطلب وتفاصيل القطع</small></span></div></div>; }
