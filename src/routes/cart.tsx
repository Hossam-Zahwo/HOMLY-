import { rememberedContact, rememberContact } from '@/lib/customer-contact';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Trash2, ShoppingCart, ArrowLeft, ArrowRight, MapPin, Truck, ShieldCheck, X, UserRound, ClipboardCheck } from 'lucide-react';
import { rememberOrder } from '@/lib/local-orders';
import { useCart } from '@/lib/cart';
import { useCatalog, Notice, Picture, Quantity, Loading } from '@/components/StoreUI';
import { shippingZones, shippingPromotion, checkoutVariantPrices, effectiveShippingFee, placeOrder, explain, money, imageFor, type Zone, type ShippingPromotion, type Order } from '@/lib/commerce';
import { EGYPT_GOVERNORATES } from '@/lib/shipping-governorates';
import { useSite, useCopy, loadSite } from '@/lib/site';
import { whatsappHref } from '@/lib/content-model';
import { orderWhatsAppUrl, requestKey } from '@/lib/checkout-message';

export const Route = createFileRoute('/cart')({
  validateSearch: (s: Record<string, unknown>) => ({
    checkout: s.checkout === true || s.checkout === 'true',
    buyNow: typeof s.buyNow === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.buyNow) ? s.buyNow : '',
    qty: Math.min(999, Math.max(1, Math.floor(Number(s.qty) || 1))),
  }),
  component: Cart,
});

function Cart() {
  const { config } = useSite();
  const copy = useCopy();
  const cart = useCart();
  const search = Route.useSearch();
  const isDirect = Boolean(search.buyNow);
  const [directQty, setDirectQty] = useState(search.qty);
  const orderLines = isDirect ? [{ variantId: search.buyNow, quantity: directQty }] : cart.lines;
  const { products, loading, error, reload } = useCatalog(false, true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [promotion, setPromotion] = useState<ShippingPromotion | null>(null);
  const [governorate, setGovernorate] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [shippingError, setShippingError] = useState('');
  const [stage, setStage] = useState(search.checkout ? 1 : 0);
  const [wizardStep, setWizardStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const wizardRef = useRef<HTMLDivElement | null>(null);
  const wizardRootRef = useRef<HTMLDivElement | null>(null);
  const wizardHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const wizardErrorRef = useRef<HTMLDivElement | null>(null);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [result, setResult] = useState<Order | null>(null);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', area: '', address: '', customer_notes: '' });
  const [remember, setRemember] = useState(true);
  const idempotency = useRef('');
  const attemptHash = useRef('');
  const submitting = useRef(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  // The router can reuse this component when a new Buy Now link is opened.
  // Reset the wizard to the newly selected product, without affecting the normal cart.
  useEffect(() => {
    setDirectQty(search.qty);
    setStage(search.checkout ? 1 : 0);
    setWizardStep(0);
    setFailure('');
    setResult(null);
    idempotency.current = '';
    attemptHash.current = '';
  }, [search.buyNow, search.qty]);

  useEffect(() => {
    const saved = rememberedContact();
    if (saved) {
      setGovernorate(saved.governorate || '');
      if (saved.shipping_zone_id) setZoneId(saved.shipping_zone_id);
      setForm({ customer_name: saved.customer_name, customer_phone: saved.customer_phone, area: saved.area, address: saved.address, customer_notes: saved.customer_notes });
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const [zonesResult, promoResult] = await Promise.allSettled([shippingZones(), shippingPromotion()]);
      if (!mounted) return;
      if (zonesResult.status === 'fulfilled') {
        setZones(zonesResult.value);
        setShippingError('');
      } else setShippingError('تعذر تحميل أسعار الشحن: ' + explain(zonesResult.reason));
      if (promoResult.status === 'fulfilled') setPromotion(promoResult.value);
      else setShippingError(prev => prev || 'تعذر التحقق من عرض الشحن المجاني. نفّذ SQL المرفق وأعد المحاولة.');
    };
    void refresh();
    const updateWhenVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', updateWhenVisible);
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    return () => { mounted = false; document.removeEventListener('visibilitychange', updateWhenVisible); clearInterval(interval); };
  }, []);

  const rows = orderLines.map(l => {
    const p = products.find(p => p.variants.some(v => v.id === l.variantId));
    const v = p?.variants.find(v => v.id === l.variantId);
    return { ...l, p, v };
  });
  const directMax = Math.max(1, Math.min(999, (rows[0]?.v?.stock_on_hand || 0) - (rows[0]?.v?.stock_reserved || 0)));
  const changeDirectQty = (quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > directMax) return;
    setDirectQty(quantity);
    setFailure('');
    idempotency.current = '';
  };
  const availableZones = zones.filter(z => z.governorate === governorate);
  const zone = zones.find(z => z.id === zoneId && z.governorate === governorate);
  const fee = effectiveShippingFee(zone, promotion);
  const subtotal = rows.reduce((n, l) => n + (l.v?.price_minor || 0) * l.quantity, 0);
  const invalid = rows.some(l => !l.v || !l.p || l.v.status !== 'published' || l.quantity > l.v.stock_on_hand - l.v.stock_reserved);
  const governorates = EGYPT_GOVERNORATES;

  const chooseGovernorate = (value: string) => {
    setGovernorate(value);
    const options = zones.filter(z => z.governorate === value);
    // Default to the unrestricted governorate-wide shipping zone, so every town is supported.
    setZoneId(options.find(z => z.areas.length === 0)?.id || (options.length === 1 ? options[0].id : ''));
    setFailure('');
    idempotency.current = '';
  };
  // Keep the saved province usable when its original shipping zone was disabled or replaced.
  useEffect(() => {
    if (!governorate || !zones.length) return;
    const choices = zones.filter(z => z.governorate === governorate);
    const defaultZoneId = choices.find(z => z.areas.length === 0)?.id || (choices.length === 1 ? choices[0].id : '');
    if (defaultZoneId && (!zoneId || !choices.some(z => z.id === zoneId))) setZoneId(defaultZoneId);
  }, [governorate, zones, zoneId]);
  // An area-specific price must match the customer's actual town exactly;
  // otherwise silently fall back to the zone that serves the whole governorate.
  useEffect(() => {
    if (!zoneId || !governorate || !zones.length || !form.area.trim()) return;
    const selected = zones.find(z => z.id === zoneId && z.governorate === governorate);
    if (selected && selected.areas.length && !selected.areas.includes(form.area.trim())) {
      const defaultZone = zones.find(z => z.governorate === governorate && z.areas.length === 0);
      if (defaultZone) setZoneId(defaultZone.id);
    }
  }, [governorate, zoneId, zones, form.area]);
  // Contact saved before zone loading might refer to a deleted/inactive zone.
  useEffect(() => {
    if (governorate || !zoneId || !zones.length) return;
    const previousZone = zones.find(z => z.id === zoneId);
    if (previousZone) setGovernorate(previousZone.governorate);
  }, [zones, governorate, zoneId]);

  // The old inline second stage was below the scroll position on mobile and desktop.
  // Lock the background page and focus the currently visible modal step instead.
  useEffect(() => {
    if (stage !== 1 || result) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [stage, result]);

  useLayoutEffect(() => {
    if (stage !== 1 || result || !mounted) return;
    // Reset *before paint*, so the next step never appears below the previous scroll.
    if (wizardRef.current) wizardRef.current.scrollTop = 0;
    wizardHeadingRef.current?.focus({ preventScroll: true });
  }, [stage, wizardStep, result, mounted]);

  useEffect(() => {
    if (stage !== 1 || !failure || result) return;
    if (wizardRef.current) wizardRef.current.scrollTop = 0;
    wizardErrorRef.current?.focus({ preventScroll: true });
  }, [stage, failure, result]);

  const closeWizard = () => {
    if (busy) return;
    setStage(0);
    setFailure('');
    window.requestAnimationFrame(() => openButtonRef.current?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    if (stage !== 1 || result) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busy) closeWizard();
      }
      if (event.key !== 'Tab') return;
      const root = wizardRootRef.current;
      if (!root) return;
      const controls = [...root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')]
        .filter(el => el.getClientRects().length > 0);
      if (!controls.length) { event.preventDefault(); root.focus(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [stage, result, busy]);

  const normalizedPhone = () => form.customer_phone.replace(/[٠-٩۰-۹]/g, c => String('٠١٢٣٤٥٦٧٨٩'.includes(c) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(c) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[\s()-]/g, '').replace(/^\+?20/, '0');
  const contactError = () => {
    if (form.customer_name.trim().length < 2) return 'اكتب اسمك بالكامل (حرفين على الأقل).';
    if (!/^01[0125]\d{8}$/.test(normalizedPhone())) return 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01.';
    return '';
  };
  const addressError = () => {
    if (!governorate) return 'اختار محافظتك من القائمة.';
    if (!EGYPT_GOVERNORATES.includes(governorate as (typeof EGYPT_GOVERNORATES)[number])) return 'اختار محافظة صحيحة من القائمة.';
    if (!zone) return availableZones.length ? 'اختار نطاق التوصيل.' : 'مش قادرين نحمّل سعر شحن المحافظة. حدّث الصفحة وحاول تاني.';
    if (!form.area.trim()) return 'اكتب اسم المدينة أو المنطقة.';
    if (form.address.trim().length < 8) return 'اكتب العنوان بالتفصيل: الشارع ورقم العمارة أو علامة مميزة.';
    return '';
  };
  const nextWizardStep = () => {
    const message = wizardStep === 0 ? contactError() : wizardStep === 1 ? addressError() : '';
    if (message) { setFailure(message); return; }
    setFailure('');
    setWizardStep(current => Math.min(2, current + 1));
  };
  const openWizard = () => {
    setWizardStep(0);
    setFailure('');
    setStage(1);
  };

  const changeField = (key: keyof typeof form, value: string) => {
    setForm(old => ({ ...old, [key]: value }));
    setFailure('');
    idempotency.current = '';
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting.current) return;
    setFailure('');
    if (error || loading) return setFailure('تعذر تحميل بيانات السلة. أعد المحاولة.');
    if (!orderLines.length) return setFailure('مفيش منتجات في الطلب.');
    if (!governorate) return setFailure('اختار المحافظة عشان نعرف نوصل لك.');
    if (!EGYPT_GOVERNORATES.includes(governorate as (typeof EGYPT_GOVERNORATES)[number])) return setFailure('اختار محافظة من القائمة.');
    if (!zone) return setFailure(availableZones.length ? 'اختار نطاق التوصيل.' : 'تعذر تحميل سعر شحن المحافظة. حدّث الصفحة وحاول تاني.');
    if (invalid) return setFailure('في منتج أو كمية غير متاحة. ارجع راجع السلة.');
    if (shippingError) return setFailure('مش قادرين نتحقق من تكلفة الشحن حاليًا. حاول مرة تانية.');
    const contactProblem = contactError();
    if (contactProblem) { setWizardStep(0); return setFailure(contactProblem); }
    const addressProblem = addressError();
    if (addressProblem) { setWizardStep(1); return setFailure(addressProblem); }
    const normalized = normalizedPhone();

    submitting.current = true;
    setBusy(true);
    try {
      // Re-check the server quote just before creating the order. The promo may have expired
      // while the customer was filling the form; never silently increase checkout total.
      const [freshZones, freshPromotion, freshVariants] = await Promise.all([
        shippingZones(), shippingPromotion(), checkoutVariantPrices(orderLines.map(line => line.variantId)),
      ]);
      setZones(freshZones);
      setPromotion(freshPromotion);
      const currentZone = freshZones.find(z => z.id === zoneId && z.governorate === governorate);
      if (!currentZone) throw new Error('منطقة التوصيل اتغيّرت. اختارها تاني قبل التأكيد.');
      if (effectiveShippingFee(currentZone, freshPromotion) !== fee) {
        throw new Error('تكلفة الشحن اتغيرت أثناء كتابة البيانات. راجع الإجمالي الظاهر واضغط تأكيد تاني.');
      }
      const changed = rows.some(line => {
        const fresh = freshVariants.get(line.variantId);
        return !fresh || fresh.price_minor !== line.v?.price_minor
          || fresh.stock_on_hand - fresh.stock_reserved < line.quantity;
      });
      if (changed) {
        reload();
        throw new Error('السعر أو الكمية المتاحة اتغيّروا. راجع السلة واضغط تأكيد تاني.');
      }
      const body = {
        ...form, customer_name: form.customer_name.trim(), area: form.area.trim(), address: form.address.trim(),
        customer_phone: normalized, governorate: zone.governorate, shipping_zone_id: zone.id,
        items: orderLines.map(l => ({ variant_id: l.variantId, quantity: l.quantity })),
      };
      const hash = JSON.stringify(body);
      let saved: {hash: string; key: string} | null = null;
      try { saved = JSON.parse(sessionStorage.getItem('homy-checkout-attempt') || 'null'); } catch {}
      idempotency.current = saved?.hash === hash ? saved.key : attemptHash.current === hash && idempotency.current ? idempotency.current : requestKey();
      attemptHash.current = hash;
      try { sessionStorage.setItem('homy-checkout-attempt', JSON.stringify({hash, key: idempotency.current})); } catch {}
      const order = await placeOrder({...body, idempotency_key: idempotency.current});
      try { sessionStorage.removeItem('homy-checkout-attempt'); } catch {}
      rememberOrder(order);
      setResult(order);
      rememberContact({...form, customer_phone: normalized, governorate: zone.governorate, shipping_zone_id: zone.id}, remember);
      if (!isDirect) cart.clear(); // Direct checkout must never modify the existing shopping cart.
      // Saved order is confirmed by the database. WhatsApp/settings failures must never reverse this success.
      let settings = config.whatsapp;
      let settingsTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        settings = (await Promise.race([loadSite(false), new Promise<never>((_, reject) => { settingsTimer = setTimeout(() => reject(new Error('timeout')), 5000); })])).config.whatsapp;
      } catch {} finally { clearTimeout(settingsTimer); }
      const link = orderWhatsAppUrl(settings, order);
      setWhatsappUrl(link);
      // The database order is already completed; WhatsApp is optional support,
      // never the checkout processor or a forced extra step.
    } catch (err) {
      setFailure(explain(err));
    } finally { submitting.current = false; setBusy(false); }
  };

  useEffect(() => { if (result) window.scrollTo(0, 0); }, [result]);

  if (result) return <div className="wrap confirmation page">
    <CheckCircle2 size={60}/><h1>{copy('orderThanks')}</h1>
    <p>رقم طلبك <strong dir="ltr">{result.code}</strong></p>
    <div className="panel">{result.items?.map(i => <div className="summary-line" key={i.id}><span>{i.title_snapshot} × {i.quantity}</span><b>{money(i.line_total_minor)}</b></div>)}
      <div className="summary-line"><span>الشحن</span><b>{result.shipping_minor === 0 ? 'مجاني' : money(result.shipping_minor)}</b></div>
      <div className="summary-line grand"><span>الإجمالي المعتمد</span><b>{money(result.total_minor)}</b></div>
    </div>
    <p>احتفظ برقم طلبك. الدفع عند الاستلام، ولم يتم خصم أي مبلغ إلكترونيًا.</p>
    {whatsappUrl && <a className="btn whatsapp-order" target="_blank" rel="noopener noreferrer" href={whatsappUrl}>تابع طلبك على واتساب</a>}
    <p className="muted small">طلبك محفوظ في نظام هومي بالفعل، ومش محتاج تفتح واتساب لإتمامه.</p>
    <Link to="/orders" className="btn outline">طلباتي</Link>
    <Link to="/products" className="btn outline">متابعة التسوق</Link>
  </div>;

  if (!cart.ready || loading) return <div className="wrap page"><Loading/></div>;
  return <div className="wrap page homey-checkout">
    <div className="checkout-steps" aria-label="خطوات الشراء"><span className={stage === 0 ? 'active' : ''}>1. السلة</span><span className={stage === 1 ? 'active' : ''}>2. تأكيد البيانات</span><span>3. تم الطلب</span></div>
    <h1>{isDirect ? 'تأكيد طلبك السريع' : 'سلة مشترياتك'}</h1>
    <p className="homey-cart-guide">{isDirect ? 'الطلب ده للمنتج اللي اخترته بس، وسلتك العادية مش هتتغير. اختار الكمية وكمل بياناتك.' : 'راجع منتجاتك والإجمالي، وبعدها اضغط «متابعة الطلب» علشان نوصّلها لك.'}</p>
    {error && <Notice>{error}<button type="button" className="text-button" onClick={reload}>إعادة المحاولة</button></Notice>}
    {!orderLines.length ? <div className="empty"><ShoppingCart size={50}/><h2>السلة لسه فاضية</h2><Link to="/products" className="btn">تسوّق المنتجات</Link></div> :
      <div className="checkout-layout" aria-hidden={stage === 1 ? true : undefined}>
        <div className="cart-items">{rows.map(l => <article className="cart-item" key={l.variantId}>
          <Picture src={l.p ? imageFor(l.p, l.v) : undefined} alt={l.p?.title_ar || 'منتج غير متاح'}/>
          <div><h3>{l.v?.title_override || l.p?.title_ar || 'منتج غير متاح'}</h3><p className="muted">{Object.values(l.v?.options || {}).join(' / ')}</p><strong>{l.v ? money(l.v.price_minor) : 'غير متاح'}</strong>{l.v && l.quantity > l.v.stock_on_hand - l.v.stock_reserved && <p className="danger">الكمية المطلوبة مش متوفرة</p>}</div>
          <Quantity value={l.quantity} max={Math.max(l.quantity, l.v ? Math.min(999, l.v.stock_on_hand - l.v.stock_reserved) : 1)} onChange={n => { if (isDirect) changeDirectQty(n); else { cart.setQty(l.variantId, n); idempotency.current = ''; } }}/>
          <b>{money((l.v?.price_minor || 0) * l.quantity)}</b>
          {isDirect ? (l.v ? <Link className="text-button homey-direct-edit" to="/product/$slug" params={{ slug: l.v.slug }}>تغيير المنتج</Link> : <Link className="text-button" to="/products">اختار منتج تاني</Link>) : <button type="button" className="icon-button" aria-label="حذف المنتج من السلة" onClick={() => { cart.remove(l.variantId); idempotency.current = ''; }}><Trash2 size={18}/></button>}
        </article>)}</div>
        <aside className="panel order-summary homey-order-summary">
          <h2>ملخص الطلب</h2>
          {rows.map(l => <div key={l.variantId} className="summary-line"><span>{l.v?.title_override || l.p?.title_ar || 'غير متاح'} × {l.quantity}</span><b>{money((l.v?.price_minor || 0) * l.quantity)}</b></div>)}
          <hr/>
          <div className="summary-line"><span>المنتجات</span><b>{money(subtotal)}</b></div>
          <div className="summary-line"><span><Truck size={16} className="inline-shipping-icon"/> الشحن</span><b>{zone ? promotion?.is_active || zone.fee_minor === 0 ? <span className="free-shipping-label">مجاني 🎉</span> : money(fee) : 'بعد اختيار المحافظة'}</b></div>
          <div className="summary-line grand"><span>{zone ? 'الإجمالي' : 'إجمالي المنتجات'}</span><b>{money(subtotal + fee)}</b></div>
          <p className="muted small">هتشوف الشحن والإجمالي النهائي قبل تأكيد الطلب. مفيش رسوم مخفية.</p>
          {invalid && <Notice>راجع المنتجات والكميات قبل إتمام الطلب.</Notice>}
          <button ref={openButtonRef} type="button" className="btn checkout-primary-action" disabled={invalid || !!error || !!shippingError} onClick={openWizard}>متابعة الطلب <ArrowLeft size={18}/></button>
          {shippingError && <Notice>{shippingError}<button type="button" className="text-button" onClick={() => window.location.reload()}>تحديث</button></Notice>}
        </aside>
      </div>}
    {mounted && stage === 1 && orderLines.length > 0 && createPortal(<div className="homey-checkout-wizard-overlay">
      <div ref={wizardRootRef} className="homey-checkout-wizard" role="dialog" aria-modal="true" aria-labelledby="homey-wizard-heading" aria-describedby="homey-wizard-description" dir="rtl">
        <div className="homey-wizard-top">
          <div><p className="homey-wizard-eyebrow">طلبك مع هومي</p><h2 id="homey-wizard-heading" ref={wizardHeadingRef} tabIndex={-1}>{wizardStep === 0 ? 'نبدأ ببياناتك' : wizardStep === 1 ? 'فين نوصّل الطلب؟' : 'راجع طلبك وأكّده'}</h2>
            <p id="homey-wizard-description">{wizardStep === 0 ? (isDirect ? 'حدد الكمية واكتب اسمك ورقم موبايلك.' : 'محتاجين اسمك ورقم موبايلك بس.') : wizardStep === 1 ? 'اكتب العنوان علشان الأوردر يوصل صح.' : 'اتأكد من الإجمالي والعنوان قبل التسجيل.'}</p></div>
          <button type="button" className="homey-wizard-close" disabled={busy} onClick={closeWizard} aria-label="إغلاق خطوات الطلب والرجوع للسلة"><X size={21}/></button>
        </div>
        <div className="homey-wizard-progress" aria-label="تقدم تأكيد الطلب">
          {['بياناتك', 'عنوانك', 'تأكيد الطلب'].map((label, index) => <div key={label} className={'homey-wizard-progress-step ' + (wizardStep === index ? 'current' : wizardStep > index ? 'done' : '')} aria-current={wizardStep === index ? 'step' : undefined}>
            <span className="homey-wizard-progress-dot">{wizardStep > index ? <CheckCircle2 size={16}/> : index + 1}</span><span>{label}</span>
          </div>)}
        </div>
        <div ref={wizardRef} className="homey-checkout-wizard-body" tabIndex={-1}>
          {failure && <div ref={wizardErrorRef} className="homey-wizard-error" role="alert" tabIndex={-1}>{failure}</div>}
          <form id="checkout-form" noValidate onSubmit={e => { e.preventDefault(); if (wizardStep < 2) nextWizardStep(); else void submit(e); }}>
            {wizardStep === 0 && <div className="homey-wizard-fields">
              {isDirect && <div className="homey-direct-product" role="group" aria-label="تفاصيل المنتج المطلوب الآن">
                <Picture src={rows[0]?.p ? imageFor(rows[0].p, rows[0].v) : undefined} alt={rows[0]?.v?.title_override || rows[0]?.p?.title_ar || 'المنتج المطلوب'}/>
                <div className="homey-direct-product-info">
                  <strong>{rows[0]?.v?.title_override || rows[0]?.p?.title_ar || 'المنتج المطلوب'}</strong>
                  <small>{rows[0]?.v ? money(rows[0].v.price_minor) + ' للقطعة' : 'جاري تحميل بيانات المنتج'}</small>
                  <div className="homey-direct-quantity-row"><span>الكمية</span><Quantity value={directQty} max={directMax} onChange={changeDirectQty}/></div>
                  <b>{money(subtotal)}</b>
                </div>
              </div>}
              <div className="homey-wizard-step-note"><UserRound size={19}/><span>{isDirect ? 'اختار العدد واكتب اسمك ورقمك، وهنكمّل التوصيل.' : 'مش محتاج تعمل حساب أو باسورد.'}</span></div>
              <label htmlFor="homey-customer-name">اسمك بالكامل <span className="required-hint">*</span><input id="homey-customer-name" required autoComplete="name" placeholder="مثال: أحمد محمد" value={form.customer_name} onChange={e => changeField('customer_name', e.target.value)}/></label>
              <label htmlFor="homey-customer-phone">رقم الموبايل <span className="required-hint">*</span><input id="homey-customer-phone" required inputMode="tel" autoComplete="tel" type="tel" dir="ltr" maxLength={18} placeholder="01XXXXXXXXX" value={form.customer_phone} onChange={e => changeField('customer_phone', e.target.value)}/></label>
              <p className="homey-wizard-help">هنستخدم الرقم لتأكيد الطلب والتواصل معاك بخصوص التوصيل بس.</p>
            </div>}
            {wizardStep === 1 && <div className="homey-wizard-fields">
              <div className="homey-wizard-step-note"><MapPin size={19}/><span>كل محافظات مصر متاحة للتوصيل.</span></div>
              <label htmlFor="homey-governorate">المحافظة <span className="required-hint">*</span><select id="homey-governorate" required value={governorate} onChange={e => chooseGovernorate(e.target.value)}><option value="">اختار محافظتك</option>{governorates.map(g => <option key={g} value={g}>{g}</option>)}</select></label>
              {governorate && availableZones.length > 1 && <label htmlFor="homey-zone">نطاق التوصيل <span className="required-hint">*</span><select id="homey-zone" required value={zoneId} onChange={e => { setZoneId(e.target.value); setFailure(''); idempotency.current = ''; }}><option value="">اختار نطاق التوصيل</option>{availableZones.map(z => <option key={z.id} value={z.id}>{z.areas.length ? z.areas.join('، ') : 'كل أنحاء المحافظة'} — {promotion?.is_active || z.fee_minor === 0 ? 'شحن مجاني' : money(z.fee_minor)}</option>)}</select></label>}
              {governorate && !availableZones.length && <p className="notice info">تعذر تحميل سعر الشحن. حدّث الصفحة وحاول تاني.</p>}
              <label htmlFor="homey-area">المدينة أو المنطقة <span className="required-hint">*</span><input id="homey-area" required autoComplete="address-level3" placeholder="مثال: سموحة أو مدينة نصر" value={form.area} onChange={e => changeField('area', e.target.value)}/></label>
              <label htmlFor="homey-address">العنوان بالتفصيل <span className="required-hint">*</span><textarea id="homey-address" required rows={2} autoComplete="street-address" placeholder="اسم الشارع ورقم العمارة والدور والشقة" value={form.address} onChange={e => changeField('address', e.target.value)}/></label>
              {zone && <div className="homey-wizard-shipping"><Truck size={18}/><span>تكلفة الشحن إلى {governorate}</span><strong>{promotion?.is_active || zone.fee_minor === 0 ? 'مجاني' : money(fee)}</strong></div>}
            </div>}
            {wizardStep === 2 && <div className="homey-wizard-review">
              <div className="homey-wizard-step-note"><ClipboardCheck size={20}/><span>راجع التفاصيل دي، وممكن ترجع تعدل أي حاجة.</span></div>
              <div className="homey-wizard-review-block"><strong>بيانات التوصيل</strong><p>{form.customer_name.trim()} — <span dir="ltr">{normalizedPhone()}</span></p><p>{governorate}، {form.area.trim()}، {form.address.trim()}</p><button className="text-button" type="button" disabled={busy} onClick={() => { setFailure(''); setWizardStep(1); }}>تعديل العنوان</button></div>
              <div className="homey-wizard-review-block"><strong>ملخص المنتجات</strong>
                {rows.map(l => <div className="homey-wizard-review-line" key={l.variantId}><span>{l.v?.title_override || l.p?.title_ar || 'منتج'} × {l.quantity}</span><b>{money((l.v?.price_minor || 0) * l.quantity)}</b></div>)}
                <div className="homey-wizard-review-line"><span>المنتجات</span><b>{money(subtotal)}</b></div>
                <div className="homey-wizard-review-line"><span>التوصيل</span><b>{zone ? (promotion?.is_active || zone.fee_minor === 0 ? 'مجاني' : money(fee)) : 'غير محدد'}</b></div>
                <div className="homey-wizard-review-line homey-wizard-total"><span>الإجمالي النهائي</span><b>{money(subtotal + fee)}</b></div>
              </div>
              <label htmlFor="homey-notes">ملاحظات للمندوب (اختياري)<textarea id="homey-notes" rows={2} placeholder="مثال: اتصل قبل الوصول" value={form.customer_notes} onChange={e => changeField('customer_notes', e.target.value)}/></label>
              <label className="check-label homey-wizard-remember"><input type="checkbox" checked={remember} onChange={e => { setRemember(e.target.checked); if (!e.target.checked) rememberContact(form, false); }}/>افتكر بياناتي على الجهاز ده للطلب الجاي</label>
              <div className="checkout-payment-note"><ShieldCheck size={21}/><span><b>الدفع عند الاستلام</b><small>طلبك هيتسجل لما تضغط تأكيد. بعد كده تقدر تتابعه على واتساب.</small></span></div>
            </div>}
          </form>
        </div>
        <div className="homey-wizard-actions">
          {wizardStep === 0 ? <button type="button" className="btn outline homey-wizard-secondary" disabled={busy} onClick={closeWizard}>رجوع للسلة</button> : <button type="button" className="btn outline homey-wizard-secondary" disabled={busy} onClick={() => { setFailure(''); setWizardStep(s => s - 1); }}><ArrowRight size={16}/> السابق</button>}
          {wizardStep < 2 ? <button type="button" className="btn homey-wizard-next" disabled={busy || invalid} onClick={nextWizardStep}>التالي <ArrowLeft size={18}/></button> : <button type="submit" form="checkout-form" className="btn homey-wizard-next" disabled={busy || invalid || !!error || !!shippingError}>{busy ? 'بنحفظ طلبك...' : `تأكيد الطلب — ${money(subtotal + fee)}`}{!busy && <CheckCircle2 size={18}/>}</button>}
        </div>
        <p className="homey-wizard-footer-note">{wizardStep + 1} من 3 · تقدر ترجع وتغيّر بياناتك في أي وقت قبل التأكيد.</p>
      </div>
    </div>, document.body)}
  </div>;
}
