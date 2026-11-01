import { rememberedContact, rememberContact } from '@/lib/customer-contact';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Trash2, ShoppingCart, ArrowLeft, MapPin, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useCatalog, Notice, Picture, Quantity, Loading } from '@/components/StoreUI';
import { shippingZones, shippingPromotion, effectiveShippingFee, placeOrder, explain, money, imageFor, type Zone, type ShippingPromotion, type Order } from '@/lib/commerce';
import { EGYPT_GOVERNORATES } from '@/lib/shipping-governorates';
import { useSite, useCopy, loadSite } from '@/lib/site';
import { whatsappHref } from '@/lib/content-model';
import { orderWhatsAppUrl, requestKey } from '@/lib/checkout-message';

export const Route = createFileRoute('/cart')({
  validateSearch: (s: Record<string, unknown>) => ({ checkout: s.checkout === true || s.checkout === 'true' }),
  component: Cart,
});

function Cart() {
  const { config } = useSite();
  const copy = useCopy();
  const cart = useCart();
  const { products, loading, error, reload } = useCatalog();
  const [zones, setZones] = useState<Zone[]>([]);
  const [promotion, setPromotion] = useState<ShippingPromotion | null>(null);
  const [governorate, setGovernorate] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [shippingError, setShippingError] = useState('');
  const [stage, setStage] = useState(Route.useSearch().checkout ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [result, setResult] = useState<Order | null>(null);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', area: '', address: '', customer_notes: '' });
  const [remember, setRemember] = useState(true);
  const idempotency = useRef('');
  const attemptHash = useRef('');
  const submitting = useRef(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

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

  const rows = cart.lines.map(l => {
    const p = products.find(p => p.variants.some(v => v.id === l.variantId));
    const v = p?.variants.find(v => v.id === l.variantId);
    return { ...l, p, v };
  });
  const availableZones = zones.filter(z => z.governorate === governorate);
  const zone = zones.find(z => z.id === zoneId && z.governorate === governorate);
  const fee = effectiveShippingFee(zone, promotion);
  const subtotal = rows.reduce((n, l) => n + (l.v?.price_minor || 0) * l.quantity, 0);
  const invalid = rows.some(l => !l.v || !l.p || l.v.status !== 'published' || l.quantity > l.v.stock_on_hand - l.v.stock_reserved);
  const governorates = [...new Set([...EGYPT_GOVERNORATES, ...zones.map(z => z.governorate)])];

  const chooseGovernorate = (value: string) => {
    setGovernorate(value);
    const options = zones.filter(z => z.governorate === value);
    setZoneId(options.length === 1 ? options[0].id : '');
    setFailure('');
    idempotency.current = '';
  };
  // Keep the saved province usable when its original shipping zone was disabled or replaced.
  useEffect(() => {
    if (!governorate || !zones.length) return;
    const choices = zones.filter(z => z.governorate === governorate);
    if (choices.length === 1 && zoneId !== choices[0].id) setZoneId(choices[0].id);
    if (choices.length > 1 && zoneId && !choices.some(z => z.id === zoneId)) setZoneId('');
  }, [governorate, zones, zoneId]);
  // Contact saved before zone loading might refer to a deleted/inactive zone.
  useEffect(() => {
    if (governorate || !zoneId || !zones.length) return;
    const previousZone = zones.find(z => z.id === zoneId);
    if (previousZone) setGovernorate(previousZone.governorate);
  }, [zones, governorate, zoneId]);

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
    if (!cart.lines.length) return setFailure('السلة فاضية؛ ضيف منتج الأول.');
    if (!governorate) return setFailure('اختار المحافظة عشان نعرف نوصل لك.');
    if (!zone) return setFailure(availableZones.length ? 'اختار نطاق التوصيل.' : 'المحافظة دي مش متاحة للتوصيل حاليًا.');
    if (invalid) return setFailure('في منتج أو كمية غير متاحة. ارجع راجع السلة.');
    if (shippingError) return setFailure('مش قادرين نتحقق من تكلفة الشحن حاليًا. حاول مرة تانية.');
    if (form.customer_name.trim().length < 2) return setFailure('اكتب اسمك بالكامل عشان نقدر نوصّل لك الطلب.');
    const normalized = form.customer_phone.replace(/[٠-٩۰-۹]/g, c => String('٠١٢٣٤٥٦٧٨٩'.includes(c) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(c) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[\s()-]/g, '').replace(/^\+?20/, '0');
    if (!/^01[0125]\d{8}$/.test(normalized)) return setFailure('رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01.');
    if (!form.area.trim()) return setFailure('اكتب اسم منطقتك أو مدينتك.');
    if (form.address.trim().length < 8) return setFailure('اكتب العنوان بالتفصيل: الشارع ورقم العمارة أو علامة مميزة.');

    submitting.current = true;
    setBusy(true);
    let popup: Window | null = null;
    try {
      if (config.whatsapp.enabled && whatsappHref(config.whatsapp.number, '')) {
        popup = window.open('', '_blank');
        if (popup) { popup.opener = null; popup.document.title = 'جاري تسجيل الطلب'; popup.document.body.textContent = 'جارٍ حفظ طلبك. سيتم فتح واتساب بعد نجاح التسجيل…'; }
      }
    } catch {}
    try {
      // Re-check the server quote just before creating the order. The promo may have expired
      // while the customer was filling the form; never silently increase checkout total.
      const [freshZones, freshPromotion] = await Promise.all([shippingZones(), shippingPromotion()]);
      setZones(freshZones);
      setPromotion(freshPromotion);
      const currentZone = freshZones.find(z => z.id === zoneId && z.governorate === governorate);
      if (!currentZone) throw new Error('منطقة التوصيل اتغيّرت. اختارها تاني قبل التأكيد.');
      if (effectiveShippingFee(currentZone, freshPromotion) !== fee) {
        throw new Error('تكلفة الشحن اتغيرت أثناء كتابة البيانات. راجع الإجمالي الظاهر واضغط تأكيد تاني.');
      }
      const body = {
        ...form, customer_name: form.customer_name.trim(), area: form.area.trim(), address: form.address.trim(),
        customer_phone: normalized, governorate: zone.governorate, shipping_zone_id: zone.id,
        items: cart.lines.map(l => ({ variant_id: l.variantId, quantity: l.quantity })),
      };
      const hash = JSON.stringify(body);
      let saved: {hash: string; key: string} | null = null;
      try { saved = JSON.parse(sessionStorage.getItem('homy-checkout-attempt') || 'null'); } catch {}
      idempotency.current = saved?.hash === hash ? saved.key : attemptHash.current === hash && idempotency.current ? idempotency.current : requestKey();
      attemptHash.current = hash;
      try { sessionStorage.setItem('homy-checkout-attempt', JSON.stringify({hash, key: idempotency.current})); } catch {}
      const order = await placeOrder({...body, idempotency_key: idempotency.current});
      try { sessionStorage.removeItem('homy-checkout-attempt'); } catch {}
      setResult(order);
      rememberContact({...form, customer_phone: normalized, governorate: zone.governorate, shipping_zone_id: zone.id}, remember);
      cart.clear();
      // Saved order is confirmed by the database. WhatsApp/settings failures must never reverse this success.
      let settings = config.whatsapp;
      let settingsTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        settings = (await Promise.race([loadSite(false), new Promise<never>((_, reject) => { settingsTimer = setTimeout(() => reject(new Error('timeout')), 5000); })])).config.whatsapp;
      } catch {} finally { clearTimeout(settingsTimer); }
      const link = orderWhatsAppUrl(settings, order);
      setWhatsappUrl(link);
      if (link) {
        if (popup && !popup.closed) { try { popup.location.replace(link); } catch { popup.close(); } }
        else { try { window.open(link, '_blank', 'noopener,noreferrer'); } catch {} }
      } else if (popup && !popup.closed) popup.close();
    } catch (err) {
      if (popup && !popup.closed) popup.close();
      setFailure(explain(err));
    } finally { submitting.current = false; setBusy(false); }
  };

  if (result) return <div className="wrap confirmation page">
    <CheckCircle2 size={60}/><h1>{copy('orderThanks')}</h1>
    <p>رقم طلبك <strong dir="ltr">{result.code}</strong></p>
    <span className="badge">تم تسجيل الطلب — بانتظار التأكيد</span>
    <div className="panel">{result.items?.map(i => <div className="summary-line" key={i.id}><span>{i.title_snapshot} × {i.quantity}</span><b>{money(i.line_total_minor)}</b></div>)}
      <div className="summary-line"><span>الشحن</span><b>{result.shipping_minor === 0 ? 'مجاني' : money(result.shipping_minor)}</b></div>
      <div className="summary-line grand"><span>الإجمالي المعتمد</span><b>{money(result.total_minor)}</b></div>
    </div>
    <p>احتفظ برقم طلبك. الدفع عند الاستلام، ولم يتم خصم أي مبلغ إلكترونيًا.</p>
    {whatsappUrl ? <a className="btn whatsapp-order" target="_blank" rel="noopener noreferrer" href={whatsappUrl}>{copy('whatsappConfirm')}</a> : <Notice kind="info">طلبك اتسجل. واتساب غير مفعّل أو الرقم غير صحيح في إعدادات المتجر.</Notice>}
    <p className="muted small">طلبك اتسجل بالفعل. لو واتساب فتح، اضغط إرسال عشان تبعت تفاصيله. لو ما فتحش استخدم الزر اللي فوق.</p>
    <Link to="/products" className="btn outline">متابعة التسوق</Link>
  </div>;

  if (!cart.ready || loading) return <div className="wrap page"><Loading/></div>;
  return <div className="wrap page homey-checkout">
    <div className="checkout-steps" aria-label="خطوات الشراء"><span className={stage === 0 ? 'active' : ''}>١. السلة</span><span className={stage === 1 ? 'active' : ''}>٢. بيانات التوصيل</span><span>٣. تم الطلب</span></div>
    <h1>{stage === 0 ? 'سلة مشترياتك' : 'فاضل خطوة ونأكد طلبك ✨'}</h1>
    {error && <Notice>{error}<button type="button" className="text-button" onClick={reload}>إعادة المحاولة</button></Notice>}
    {!cart.lines.length ? <div className="empty"><ShoppingCart size={50}/><h2>السلة لسه فاضية</h2><Link to="/products" className="btn">تسوّق المنتجات</Link></div> :
    <div className="checkout-layout">
      <div>
        {stage === 0 ? <div className="cart-items">{rows.map(l => <article className="cart-item" key={l.variantId}>
          <Picture src={l.p ? imageFor(l.p,l.v) : undefined} alt={l.p?.title_ar || 'منتج غير متاح'}/>
          <div><h3>{l.v?.title_override || l.p?.title_ar || 'منتج غير متاح'}</h3><p className="muted">{Object.values(l.v?.options || {}).join(' / ')}</p><strong>{l.v ? money(l.v.price_minor) : 'غير متاح'}</strong>{l.v && l.quantity > l.v.stock_on_hand - l.v.stock_reserved && <p className="danger">الكمية المطلوبة مش متوفرة</p>}</div>
          <Quantity value={l.quantity} max={Math.max(l.quantity,l.v ? l.v.stock_on_hand - l.v.stock_reserved : 1)} onChange={n => {cart.setQty(l.variantId,n); idempotency.current='';}}/>
          <b>{money((l.v?.price_minor || 0)*l.quantity)}</b>
          <button type="button" className="icon-button" aria-label="حذف المنتج من السلة" onClick={() => {cart.remove(l.variantId); idempotency.current='';}}><Trash2 size={18}/></button>
        </article>)}</div> :
          <form id="checkout-form" className="panel homey-checkout-form" noValidate onSubmit={submit}>
            <div className="checkout-form-heading"><MapPin size={21}/><div><h2>فين نوصّل طلبك؟</h2><p className="muted small">املأ البيانات دي بس، مش محتاج تعمل حساب.</p></div></div>
            <div className="form-grid">
              <label>الاسم بالكامل <span className="required-hint">*</span><input required autoComplete="name" placeholder="مثال: أحمد محمد" value={form.customer_name} onChange={e => changeField('customer_name',e.target.value)}/></label>
              <label>رقم الموبايل <span className="required-hint">*</span><input required inputMode="tel" autoComplete="tel" type="tel" dir="ltr" maxLength={18} placeholder="01XXXXXXXXX" value={form.customer_phone} onChange={e => changeField('customer_phone',e.target.value)}/></label>
              <label>المحافظة <span className="required-hint">*</span><select required value={governorate} onChange={e=>chooseGovernorate(e.target.value)}><option value="">اختار محافظتك</option>{governorates.map(g => <option key={g} value={g}>{g}{!zones.some(z => z.governorate === g) ? ' (غير متاحة حاليًا)' : ''}</option>)}</select></label>
              {governorate && availableZones.length > 1 && <label>نطاق التوصيل <span className="required-hint">*</span><select required value={zoneId} onChange={e => {setZoneId(e.target.value); setFailure(''); idempotency.current='';}}><option value="">اختار نطاق التوصيل</option>{availableZones.map(z => <option key={z.id} value={z.id}>{z.areas.length ? z.areas.join('، ') : 'كل أنحاء المحافظة'} — {promotion?.is_active ? 'شحن مجاني' : money(z.fee_minor)}</option>)}</select></label>}
              {governorate && !availableZones.length && <p className="full notice info">التوصيل للمحافظة دي مش متاح حاليًا. اختار محافظة متاحة أو تواصل معانا قبل الطلب.</p>}
              <label>المدينة أو المنطقة <span className="required-hint">*</span><input required autoComplete="address-level3" placeholder="مثال: سموحة، أو مدينة نصر" value={form.area} onChange={e => changeField('area',e.target.value)}/></label>
              <label className="full">العنوان بالتفصيل <span className="required-hint">*</span><textarea required rows={2} autoComplete="street-address" placeholder="اسم الشارع، رقم العمارة، الدور، الشقة أو علامة مميزة" value={form.address} onChange={e => changeField('address',e.target.value)}/></label>
              <label className="full">ملاحظات للسائق (اختياري)<textarea rows={2} placeholder="مثال: اتصل قبل الوصول" value={form.customer_notes} onChange={e => changeField('customer_notes',e.target.value)}/></label>
              <label className="full check-label checkout-remember"><input type="checkbox" checked={remember} onChange={e => {setRemember(e.target.checked); if (!e.target.checked) rememberContact(form,false);}}/>افتكر بياناتي على الجهاز ده للطلب الجاي</label>
            </div>
            <div className="checkout-payment-note"><ShieldCheck size={20}/><span><b>الدفع عند الاستلام</b><small>طلبك هيتسجل أولًا، وبعدها تقدر تبعت تأكيده على واتساب.</small></span></div>
          </form>}
        {stage === 1 && <button type="button" className="text-button" onClick={() => {setStage(0); setFailure('');}}>الرجوع للسلة وتعديل المنتجات</button>}
      </div>
      <aside className="panel order-summary homey-order-summary">
        <h2>ملخص الطلب</h2>
        {rows.map(l => <div key={l.variantId} className="summary-line"><span>{l.v?.title_override || l.p?.title_ar || 'غير متاح'} × {l.quantity}</span><b>{money((l.v?.price_minor || 0)*l.quantity)}</b></div>)}
        <hr/>
        <div className="summary-line"><span>المنتجات</span><b>{money(subtotal)}</b></div>
        <div className="summary-line"><span><Truck size={16} className="inline-shipping-icon"/> الشحن</span><b>{zone ? promotion?.is_active ? <span className="free-shipping-label">{zone.fee_minor>0 && <del>{money(zone.fee_minor)}</del>} مجاني 🎉</span> : money(fee) : 'بعد اختيار المحافظة'}</b></div>
        {promotion?.is_active && <p className="free-shipping-message">🎁 شحن مجاني لفترة محدودة على المحافظات المتاحة!</p>}
        <div className="summary-line grand"><span>{zone ? 'الإجمالي' : 'إجمالي المنتجات'}</span><b>{money(subtotal + fee)}</b></div>
        {stage === 0 && <p className="muted small">تكلفة الشحن هتظهر لما تختار محافظتك في الخطوة الجاية.</p>}
        {shippingError && <Notice>{shippingError}<button type="button" className="text-button" onClick={() => window.location.reload()}>تحديث</button></Notice>}
        {invalid && <Notice>راجع المنتجات والكميات قبل إتمام الطلب.</Notice>}
        {failure && <div className="notice" role="alert" aria-live="assertive">{failure}</div>}
        {stage === 0 ? <button type="button" className="btn checkout-primary-action" disabled={invalid || !!error} onClick={() => setStage(1)}>متابعة لبيانات التوصيل <ArrowLeft size={17}/></button> :
          <button type="submit" form="checkout-form" className="btn checkout-primary-action" disabled={busy || invalid || !!error}>{busy ? 'جاري تسجيل طلبك...' : 'تأكيد الطلب الآن'}</button>}
        {stage === 1 && <p className="small muted">بالضغط على «تأكيد الطلب»، هيتم حفظ الطلب في المتجر. بعد كده يفتح واتساب لو متاح.</p>}
      </aside>
    </div>}
  </div>;
}
