import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Menu, ShoppingCart, Search, X, ArrowLeft, Truck, ShieldCheck, PackageCheck, Minus, Plus, Zap, Heart } from 'lucide-react';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import { catalog, explain, money, imageFor, assetUrl, type Catalog, type Product, type Variant } from '@/lib/commerce';
import { useCart } from '@/lib/cart';
import {useFavorites} from '@/lib/favorites';
import {latinDigits} from '@/lib/digits';
import {supabaseResponsiveImage,hasResponsiveTransform} from '@/lib/image-optimization';
import bundledHeroFallback from '@/assets/homey-hero-flowers.jpg';

// On iOS every browser uses WebKit. Avoid transform endpoints that may fail or stall
// on Safari, and wake images near scrollable sliders before the user reaches them.
function isIOSWebKit(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

import { configured } from '@/lib/supabase';
import { useSite, useCopy } from '@/lib/site';
import { safeHref, whatsappHref } from '@/lib/content-model';
import { toast } from 'sonner';
export function Logo() { const { config } = useSite(); return <Link to="/" className="logo" aria-label={config.brand.name + ' الرئيسية'}>{config.brand.logo ? <img src={assetUrl(config.brand.logo)} alt={config.brand.name} style={{width:"auto",height:"auto",maxHeight:64,maxWidth:190,objectFit:"contain"}}/> : <><b>{config.brand.name}</b><small>{config.brand.latin}</small></>}</Link>; }
/**
 * Loading policy: only the first visible hero/product-detail image is urgent.
 * On Supabase Pro, setting VITE_HOMEY_IMAGE_TRANSFORMS=true additionally enables
 * width-specific CDN images. The default remains safe for free accounts.
 */
const SAFE_IMAGE_FALLBACK = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360"><rect width="480" height="360" rx="18" fill="#FAF5EE"/><path d="M145 225l70-72 52 48 36-33 49 57" stroke="#A8AE9B" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="191" cy="120" r="23" fill="#DADCCF"/></svg>');
export function Picture({ src, fallbackSrc, alt = '', className = '', priority = false, kind = 'product' }: {
    src?: string;
    fallbackSrc?: string;
    alt?: string;
    className?: string;
    priority?: boolean;
    kind?: 'product' | 'hero' | 'category' | 'thumbnail';
}) {
    const primary = assetUrl(src || '');
    const secondary = fallbackSrc && assetUrl(fallbackSrc) !== primary ? assetUrl(fallbackSrc) : null;
    const [trySecondary, setTrySecondary] = useState(false);
    const original = trySecondary && secondary ? secondary : primary;
    const imageRef = useRef<HTMLImageElement | null>(null);
    const iosWebKit = isIOSWebKit();
    const important = priority || kind === 'hero';
    // Use explicit proximity loading on all browsers to keep SSR hydration
    // stable. Native lazy-loading alone may stall in WebKit scroll containers.
    // Distant cards show a tiny local placeholder until their actual URL is set.
    const [nearViewport, setNearViewport] = useState(() => important);
    const [useOriginal, setUseOriginal] = useState(false);
    const [failed, setFailed] = useState(false);
    useEffect(() => { setTrySecondary(false); }, [primary, secondary]);
    useEffect(() => {
        setNearViewport(important);
        setUseOriginal(false);
        setFailed(false);
    }, [original, important, iosWebKit]);
    useEffect(() => {
        if (nearViewport) return;
        const img = imageRef.current;
        if (!img) return;
        let done = false;
        const activate = () => { if (!done) { done = true; setNearViewport(true); } };
        const checkDistance = () => {
            if (done) return;
            const r = img.getBoundingClientRect();
            const height = window.innerHeight || document.documentElement.clientHeight;
            const width = window.innerWidth || document.documentElement.clientWidth;
            if (r.bottom >= -450 && r.top <= height + 850 && r.right >= -250 && r.left <= width + 250) activate();
        };
        // Check synchronously after mount and again after flex layout completes.
        checkDistance();
        const scheduled = window.setTimeout(checkDistance, 350);
        let observer: IntersectionObserver | null = null;
        if (typeof IntersectionObserver !== 'undefined') {
            observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) activate();
            }, { rootMargin: '850px 250px 450px', threshold: 0 });
            observer.observe(img);
        } else {
            // Older WebKit: fallback for visible rows, not 100 eager images.
            window.addEventListener('scroll', checkDistance, { passive: true });
            window.addEventListener('resize', checkDistance, { passive: true });
        }
        return () => {
            done = true;
            window.clearTimeout(scheduled);
            observer?.disconnect();
            window.removeEventListener('scroll', checkDistance);
            window.removeEventListener('resize', checkDistance);
        };
    }, [original, nearViewport]);
    const responsive = !iosWebKit && hasResponsiveTransform(original) && !useOriginal;
    const widths = kind === 'hero' ? [640, 960, 1440, 1920]
        : kind === 'category' ? [180, 320, 480, 720]
        : kind === 'thumbnail' ? [96, 160, 240]
        : [320, 480, 720, 960, 1400];
    const sizes = kind === 'hero' ? '(max-width: 767px) 100vw, 1100px'
        : kind === 'category' ? '(max-width: 767px) 32vw, 190px'
        : kind === 'thumbnail' ? '96px'
        : '(max-width: 767px) 48vw, (max-width: 1100px) 30vw, 260px';
    const preferredWidth = kind === 'hero' ? 1440 : kind === 'thumbnail' ? 160 : kind === 'category' ? 320 : 720;
    const imageSrc = responsive ? supabaseResponsiveImage(original, preferredWidth) : original;
    const imageSrcSet = responsive ? widths.map(width => `${supabaseResponsiveImage(original, width)} ${width}w`).join(', ') : undefined;
    const showActual = nearViewport && !failed;
    const finalSrc = failed ? (kind === 'hero' ? bundledHeroFallback : SAFE_IMAGE_FALLBACK)
        : !nearViewport ? SAFE_IMAGE_FALLBACK : imageSrc;
    return <img
        ref={imageRef}
        src={finalSrc}
        srcSet={showActual ? imageSrcSet : undefined}
        sizes={showActual && responsive ? sizes : undefined}
        width={kind === 'hero' ? 1600 : kind === 'category' ? 480 : kind === 'thumbnail' ? 120 : 720}
        height={kind === 'hero' ? 740 : kind === 'category' ? 320 : kind === 'thumbnail' ? 120 : 720}
        alt={alt} className={className}
        // The real URL is only present when near; eager loading is then safe
        // and avoids native lazy-loading stalls in iOS scroll containers.
        loading="eager"
        fetchPriority={priority && kind === 'hero' ? 'high' : undefined}
        decoding="async"
        onError={() => {
            if (!nearViewport || failed) return;
            if (responsive && !useOriginal) { setUseOriginal(true); return; }
            if (secondary && !trySecondary) { setTrySecondary(true); return; }
            // React state holds the fallback across renders/slider transitions;
            // mutating img.src directly would get reset on every React render.
            setFailed(true);
        }}
    />;
}
export function ModeNotice() { return !configured ? <div className="mode-notice warning">لم تُضف إعدادات Supabase بعد. أضفها إلى .env.local لعرض البيانات وحفظها.</div> : null; }
// Re-use a successful public catalog across route changes. Do not refetch eight
// Supabase tables whenever the customer switches tabs or returns to the browser.
const CATALOG_CACHE_MS = 120_000;
let publicCatalogCache: {at: number; promise: Promise<Catalog>} | null = null;
function sharedCatalog(admin: boolean): Promise<Catalog> {
    if (admin) return catalog(true);
    if (publicCatalogCache && Date.now() - publicCatalogCache.at < CATALOG_CACHE_MS) {
        return publicCatalogCache.promise;
    }
    const promise = catalog(false).catch(error => {
        publicCatalogCache = null;
        throw error;
    });
    publicCatalogCache = {at: Date.now(), promise};
    return promise;
}
export function useCatalog(admin = false) {
    const [data, setData] = useState<Catalog>({products: [], categories: []});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [version, setVersion] = useState(0);
    const hasLoadedOnce = useRef(false);
    const lastRefresh = useRef(Date.now());

    useEffect(() => {
        const invalidate = () => {
            publicCatalogCache = null;
            lastRefresh.current = Date.now();
            setVersion(v => v + 1);
        };
        const refreshIfStale = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - lastRefresh.current < CATALOG_CACHE_MS) return;
            lastRefresh.current = Date.now();
            setVersion(v => v + 1);
        };
        window.addEventListener('homy-catalog-changed', invalidate);
        window.addEventListener('focus', refreshIfStale);
        document.addEventListener('visibilitychange', refreshIfStale);
        return () => {
            window.removeEventListener('homy-catalog-changed', invalidate);
            window.removeEventListener('focus', refreshIfStale);
            document.removeEventListener('visibilitychange', refreshIfStale);
        };
    }, []);

    useEffect(() => {
        let live = true;
        if (!hasLoadedOnce.current) setLoading(true);
        // No infinite skeleton if Supabase/network stalls. An eventual successful
        // response can still update the UI, without requiring a manual reload.
        const safety = window.setTimeout(() => {
            if (live && !hasLoadedOnce.current) {
                setLoading(false);
                setError('التحميل اتأخر بسبب الاتصال. جرّب إعادة المحاولة.');
            }
        }, 13000);
        sharedCatalog(admin).then(d => {
            if (!live) return;
            setData(d);
            hasLoadedOnce.current = true;
            setError('');
        }).catch(e => {
            if (!live) return;
            if (!hasLoadedOnce.current) setData({products: [],categories: []});
            setError(explain(e));
        }).finally(() => {
            window.clearTimeout(safety);
            if (live) setLoading(false);
        });
        return () => {
            live = false;
            window.clearTimeout(safety);
        };
    }, [admin, version]);

    return {...data, loading, error, reload: () => {
        publicCatalogCache = null;
        lastRefresh.current = Date.now();
        setVersion(v => v + 1);
    }};
}
export function Notice({ children, kind = 'error' }: {
    children: ReactNode;
    kind?: string;
}) { return <div role={kind === 'error' ? 'alert' : 'status'} className={'notice ' + kind}>{children}</div>; }
export function Loading() { return <div className="product-grid">{Array.from({ length: 4 }, (_, i) => <div className="skeleton" key={i}/>)}</div>; }
export function Empty({ text }: {
    text?: string;
}) { const copy = useCopy(); return <div className="empty"><PackageCheck /><p>{text || copy('emptyProducts', 'لا توجد منتجات منشورة في هذا القسم بعد.')}</p><Link to="/products" className="btn outline">استكشف المنتجات</Link></div>; }
export function Header() {
    const { categories } = useCatalog();
    const { config, preview, error } = useSite();
    const { lines } = useCart();
    const {count: favoritesCount} = useFavorites();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [cartPulse, setCartPulse] = useState(0);
    const [addedQuantity, setAddedQuantity] = useState(1);
    const headerRef = useRef<HTMLElement | null>(null);
    const location = useLocation();
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    const cats = categories.length ? categories : [];

    useEffect(() => setOpen(false), [location.pathname]);
    // Keep anchored navigation visible beneath the sticky header, even as its
    // dimensions change between desktop, mobile, and storefront configurations.
    useEffect(() => {
        const header = headerRef.current;
        if (!header) return;
        const updateOffset = () => document.documentElement.style.setProperty('--homey-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
        updateOffset();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateOffset) : null;
        observer?.observe(header);
        window.addEventListener('resize', updateOffset);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', updateOffset);
            document.documentElement.style.removeProperty('--homey-header-height');
        };
    }, []);
    useEffect(() => {
        const animate = (event: Event) => {
            const quantity = (event as CustomEvent<{quantity?: number}>).detail?.quantity;
            setAddedQuantity(Number.isFinite(quantity) && Number(quantity) > 0 ? Number(quantity) : 1);
            setCartPulse(previous => previous + 1);
        };
        window.addEventListener('homey:cart-added', animate);
        return () => window.removeEventListener('homey:cart-added', animate);
    }, []);
    useEffect(() => {
        if (!cartPulse) return;
        const timer = window.setTimeout(() => setCartPulse(0), 1600);
        return () => window.clearTimeout(timer);
    }, [cartPulse]);

    return <>
        {config.header.announcement && <div className="announcement">{config.header.announcement}</div>}
        <header ref={headerRef} className="store-header">
            <div className="header-main wrap">
                <button type="button" className="icon-button mobile-menu" aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={open} aria-controls="homey-store-nav" onClick={() => setOpen(current => !current)}>{open ? <X/> : <Menu/>}</button>
                <Logo/>
                {config.header.showSearch && <form className="search" action="/products"><Search size={18}/><input name="q" aria-label="ابحث عن منتج" placeholder={latinDigits(config.header.searchPlaceholder)} value={q} onChange={e => setQ(e.target.value)}/></form>}
                <div className="header-actions">
                    {config.header.showOrders && <Link to="/orders" className="account-link">طلباتي</Link>}
                    <Link to="/favorites" className="homey-header-favorites" aria-label={`المفضلة، ${favoritesCount} منتجات`}><Heart size={20} aria-hidden="true"/><span className="homey-favorite-label">المفضلة</span>{favoritesCount > 0 && <small className="homey-favorite-count">{favoritesCount}</small>}</Link>
                    <Link to="/cart" search={{ checkout: false }} className="cart-link homey-cart-action" aria-label={`سلة التسوق، ${count} ${count === 1 ? 'منتج' : 'منتجات'}`}>
                        <ShoppingCart size={24}/>
                        {count > 0 && <span key={`cart-counter-${cartPulse}`} className={'homey-cart-count' + (cartPulse ? ' homey-cart-count-bump' : '')} aria-hidden="true">{count > 99 ? '99+' : count}</span>}
                        {cartPulse > 0 && <span key={`cart-feedback-${cartPulse}`} className="homey-cart-added-pop" role="status">+{addedQuantity} اتضاف للسلة ✓</span>}
                    </Link>
                </div>
            </div>
            <nav id="homey-store-nav" className={'store-nav ' + (open ? 'is-open' : '')} aria-label="أقسام المتجر">
                {config.header.links.filter(l => l.visible).map(l => <a href={safeHref(l.href)} key={l.id}>{latinDigits(l.label)}</a>)}
                {config.header.showCategories && cats.map(c => <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }}>{latinDigits(c.name_ar)}</Link>)}
            </nav>
        </header>
        <ModeNotice/>
        {preview && <div className="mode-notice">معاينة مسودة للإدارة فقط — المحتوى ده لسه مش منشور للعملاء.</div>}
        {error && <div className="mode-notice warning">{error}</div>}
    </>;
}
export function Footer() { const { config } = useSite(); const wa = config.whatsapp.enabled ? whatsappHref(config.whatsapp.number, 'أهلًا، محتاج مساعدة من ' + config.brand.name) : ''; const socialLinks=[{label:'إنستجرام',url:'https://www.instagram.com/homeyegypt.ecom/',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none"/></svg>},{label:'فيسبوك',url:'https://www.facebook.com/share/1EAXrafo9m/',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.25.2 2.25.2v2.47H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"/></svg>}]; return <><footer className="store-footer"><div className="wrap footer-grid"><div><Logo /><p className="preserve-lines">{config.footer.description}</p></div>{config.footer.columns.map(c => <div key={c.id}><h3>{c.title}</h3>{c.links.filter(l => l.visible).map(l => <a href={safeHref(l.href)} key={l.id}>{latinDigits(l.label)}</a>)}</div>)}<div><h3>تابعنا</h3><div className="homey-social-icons">{socialLinks.map(l=><a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label}>{l.icon}</a>)}</div><a className="homey-policy-link" href="/page/returns-policy">سياسة الاسترجاع والاستبدال</a></div></div><div className="footer-bottom">© {new Date().getFullYear()} — {config.footer.copyright}</div></footer>{wa && config.whatsapp.showFloating && <a className="floating-whatsapp homey-whatsapp-icon" href={wa} target="_blank" rel="noopener noreferrer" aria-label="التواصل عبر واتساب" title="تواصل معنا على واتساب"><svg width="29" height="29" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 .8A15.1 15.1 0 0 0 3 23.6L.9 31l7.6-2A15.2 15.2 0 1 0 16 .8Zm0 27.6a12.3 12.3 0 0 1-6.3-1.7l-.5-.3-4.5 1.2 1.2-4.4-.3-.5A12.3 12.3 0 1 1 16 28.4Zm6.8-9.2c-.4-.2-2.2-1.1-2.5-1.2-.3-.1-.5-.2-.7.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7.4-.6c.1-.2.1-.5 0-.7l-1.1-2.6c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.8c.2.2 2.6 4 6.3 5.5.9.4 1.6.6 2.2.7.9.3 1.8.2 2.5.1.8-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.2-.3-.3-.7-.5Z"/></svg></a>}</>; }
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
}) { return <div className="quantity"><button type="button" aria-label="تقليل الكمية" disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={15}/></button><span>{value}</span><button type="button" aria-label="زيادة الكمية" disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={15}/></button></div>; }
export function ProductCard({ p, v, priority = false }: {
    p: Product;
    v: Variant;
    priority?: boolean;
}) {
    const copy = useCopy();
    const { add } = useCart();
    const {has,toggle} = useFavorites();
    const navigate = useNavigate();
    const [buying, setBuying] = useState(false);
    const buyNowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (buyNowTimer.current !== null) clearTimeout(buyNowTimer.current); }, []);
    const buyNow = () => {
        if (buying || stock < 1) return;
        setBuying(true);
        // Short visual confirmation, then land directly in the checkout wizard.
        buyNowTimer.current = setTimeout(() => {
            void navigate({ to: '/cart', search: { checkout: true, buyNow: v.id, qty: 1 } });
        }, 135);
    };
    const stock = v.stock_on_hand - v.stock_reserved;
    const title = latinDigits(v.title_override || p.title_ar);
    const options = latinDigits(Object.values(v.options).filter(Boolean).join(' / '));
    const hasDiscount = Boolean(v.compare_at_minor && v.compare_at_minor > v.price_minor);
    return <article className="product-card">
        <div className="homey-product-media">
        <Link to="/product/$slug" params={{ slug: v.slug }} className="product-photo" aria-label={title}>
            <Picture src={imageFor(p, v)} fallbackSrc={p.images.find(url => url !== imageFor(p, v))} alt={title} priority={priority}/>
            {hasDiscount ? <span className="discount">عرض خاص</span> : null}
        </Link>
        <button type="button" className={'homey-favorite-toggle' + (has(v.id) ? ' is-favorite' : '')}
          aria-label={has(v.id) ? `إزالة ${title} من المفضلة` : `إضافة ${title} للمفضلة`}
          title={has(v.id) ? 'إزالة من المفضلة' : 'أضف للمفضلة'} aria-pressed={has(v.id)}
          onClick={() => { toggle(v.id); toast.success(has(v.id) ? 'اتشال من المفضلة' : 'اتحفظ في المفضلة', {duration: 1100}); }}>
          <Heart size={19} fill={has(v.id) ? 'currentColor' : 'none'} aria-hidden="true"/>
        </button></div>
        <div className="product-copy">
            <Link to="/product/$slug" params={{ slug: v.slug }} className="product-card-title-link" title={title}>
                <h3>{title}</h3>
            </Link>
            <p className="muted options-copy" title={options || undefined} aria-hidden={!options}>{options || '\u00a0'}</p>
            <div className="price-row">
                <strong>{money(v.price_minor)}</strong>
                {hasDiscount && v.compare_at_minor ? <del>{money(v.compare_at_minor)}</del> : null}
            </div>
            <div className="homey-card-actions">
                <button type="button" disabled={stock < 1 || buying} className="btn compact homey-card-add" onClick={() => {
                    add(v.id);
                    toast.success('اتضاف للسلة ✓', { duration: 850, className: 'homey-cart-toast' });
                }}><ShoppingCart size={15}/>{stock > 0 ? copy('productAdd', 'أضف للسلة') : copy('outOfStock', 'غير متوفر')}</button>
                <button type="button" disabled={stock < 1 || buying} className={'btn compact homey-btn-buy-now' + (buying ? ' homey-buy-now-active' : '')} onClick={buyNow} aria-label={`اطلب الآن: ${title}`}><Zap size={15} aria-hidden="true"/>{buying ? 'جاري الطلب...' : 'اطلب الآن'}</button>
            </div>
        </div>
    </article>;
}
export function TrustStrip() { const copy = useCopy(); return <div className="trust-strip wrap"><div><Truck /><span>{copy('trustShipping')}<small>{copy('shippingNote')}</small></span></div><div><ShieldCheck /><span>{copy('trustQuality')}<small>وصف ومواصفات لكل منتج</small></span></div><div><PackageCheck /><span>{copy('trustOrders')}<small>حالة الطلب وتفاصيل القطع</small></span></div></div>; }
