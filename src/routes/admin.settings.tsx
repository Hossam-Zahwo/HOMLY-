import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminPage } from '@/components/AdminUI';
import { Notice } from '@/components/StoreUI';
import { configured } from '@/lib/supabase';
import { catalog, shippingZones, saveZone, shippingPromotion, saveShippingPromotion, explain, type Zone, type ShippingPromotion } from '@/lib/commerce';
import { EGYPT_GOVERNORATES } from '@/lib/shipping-governorates';
import { loadSite, savePushKey } from '@/lib/site';

export const Route = createFileRoute('/admin/settings')({ component: () => <AdminPage><Settings /></AdminPage> });
const initialPromotion: ShippingPromotion = { enabled: false, starts_at: null, ends_at: null, is_active: false };
const asLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function Settings() {
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zone, setZone] = useState<Partial<Zone> | null>(null);
  const [areasText, setAreasText] = useState('');
  const [promotion, setPromotion] = useState<ShippingPromotion>(initialPromotion);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoStart, setPromoStart] = useState('');
  const [promoEnd, setPromoEnd] = useState('');
  const [promoError, setPromoError] = useState('');
  const [key, setKey] = useState('');
  const [version, setVersion] = useState(0);

  const loadZones = async () => { const values = await shippingZones(true); setZones(values); };
  const loadPromotion = async () => {
    const value = await shippingPromotion();
    setPromotion(value);
    setPromoEnabled(value.enabled);
    setPromoStart(asLocalInput(value.starts_at));
    setPromoEnd(asLocalInput(value.ends_at));
    setPromoError('');
  };
  useEffect(() => {
    void loadZones().catch(e => setResult(explain(e)));
    void loadPromotion().catch(e => setPromoError('تعذر قراءة إعداد الشحن المجاني. نفّذ ملف SQL المرفق أولًا. ' + explain(e)));
    void loadSite(true).then(d => { setKey(d.config.pushPublicKey); setVersion(d.version); }).catch(() => {});
  }, []);

  const configuredCount = new Set(zones.filter(z => z.is_active && EGYPT_GOVERNORATES.includes(z.governorate as (typeof EGYPT_GOVERNORATES)[number])).map(z => z.governorate)).size;
  return <>
    <h1>إعدادات المتجر والربط</h1>
    <section className="panel">
      <h2>حالة الاتصال</h2>
      <p>{configured ? 'إعدادات Supabase موجودة' : 'أضف إعدادات Supabase في البيئة'}</p>
      <button className="btn outline" disabled={busy} onClick={async () => {
        setBusy(true);
        try { const [c, z] = await Promise.all([catalog(), shippingZones()]); setResult('نجحت القراءة: ' + c.products.length + ' عائلة و' + z.length + ' منطقة شحن.'); }
        catch (e) { setResult(explain(e)); }
        finally { setBusy(false); }
      }}>اختبار القراءة</button>
      {result && <Notice kind="info">{result}</Notice>}
    </section>

    <section className="panel" id="shipping-promotion">
      <div className="section-head"><h2>عرض الشحن المجاني</h2><span className={'shipping-promo-status ' + (promotion.is_active ? 'active' : '')}>{promotion.is_active ? 'شغال الآن' : promotion.enabled ? 'مجدول أو منتهي' : 'غير مفعّل'}</span></div>
      <p className="muted small">فعّل شحن مجاني لكل محافظات مصر خلال فترة محددة. أسعار المحافظات الأصلية هتفضل محفوظة، وهترجع تلقائيًا بعد انتهاء الفترة.</p>
      {promoError && <Notice>{promoError}</Notice>}
      <form className="shipping-promo-form" onSubmit={async e => {
        e.preventDefault();
        setPromoError('');
        const from = promoStart ? new Date(promoStart) : new Date();
        const to = promoEnd ? new Date(promoEnd) : null;
        if (promoEnabled && (!to || !Number.isFinite(to.getTime()) || to.getTime() <= from.getTime() || to.getTime() <= Date.now())) {
          setPromoError('حدد تاريخ ووقت نهاية بعد البداية وفي المستقبل.'); return;
        }
        setBusy(true);
        try {
          const value = await saveShippingPromotion({ enabled: promoEnabled, starts_at: promoEnabled ? from.toISOString() : null, ends_at: promoEnabled ? to!.toISOString() : null });
          setPromotion(value);
          setPromoStart(asLocalInput(value.starts_at));
          setPromoEnd(asLocalInput(value.ends_at));
          toast.success('تم حفظ إعداد الشحن المجاني');
        } catch (err) { setPromoError(explain(err)); }
        finally { setBusy(false); }
      }}>
        <label className="check-label"><input type="checkbox" checked={promoEnabled} onChange={e => setPromoEnabled(e.target.checked)}/>تفعيل الشحن المجاني لفترة محددة</label>
        {promoEnabled && <div className="form-grid">
          <label>بداية العرض (اتركها فاضية ليبدأ الآن)<input type="datetime-local" value={promoStart} onChange={e => setPromoStart(e.target.value)}/></label>
          <label>نهاية العرض (مطلوبة)<input type="datetime-local" required value={promoEnd} onChange={e => setPromoEnd(e.target.value)}/></label>
        </div>}
        <div className="button-row"><button className="btn" disabled={busy}>{busy ? 'جاري الحفظ...' : 'حفظ إعداد الشحن'}</button><button className="btn outline" type="button" disabled={busy} onClick={() => void loadPromotion().catch(e => setPromoError(explain(e)))}>تحديث الحالة</button></div>
      </form>
    </section>

    <section className="panel" id="shipping-zones">
      <div className="section-head"><h2>أسعار الشحن حسب المحافظة</h2><button className="btn" onClick={() => {setAreasText('');setZone({ governorate: '', areas: [], fee_minor: 0, is_active: true });}}>إضافة منطقة</button></div>
      <p className="muted small">المتاح للطلب: {configuredCount} من أصل 27 محافظة. بعد تشغيل تحديث SQL الجديد، كل محافظات مصر متاحة دائمًا. ممكن تغيّر سعر الشحن لكن مش ممكن توقف محافظة. سعر الشحن 0 جنيه مسموح وبيخلي المحافظة متاحة بشحن مجاني.</p>
      <div className="shipping-zone-list">
        {zones.map(z => <div className="shipping-zone-row" key={z.id}>
          <span><strong>{z.governorate}</strong>{z.areas.length > 0 && <small className="muted">{z.areas.join('، ')}</small>}</span>
          <b>{(z.fee_minor / 100).toLocaleString('ar-EG')} ج.م</b>
          <span className={z.is_active ? 'shipping-zone-active' : 'muted small'}>{z.is_active ? 'متاحة دائمًا' : 'مطلوب تشغيل تحديث SQL'}</span>
          <button className="btn outline compact" onClick={() => { setZone({...z}); setAreasText(z.areas.join('، ')); document.getElementById('shipping-zone-editor')?.scrollIntoView({behavior:'smooth',block:'center'}); }}>تعديل</button>
        </div>)}
      </div>
      {zone && <form id="shipping-zone-editor" className="form-grid shipping-zone-editor" onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        try { await saveZone({...zone, is_active: EGYPT_GOVERNORATES.includes(zone.governorate as (typeof EGYPT_GOVERNORATES)[number]) ? true : zone.is_active, areas: areasText.split(/[,،]/).map(part => part.trim()).filter(Boolean)}); setZone(null); await loadZones(); toast.success('تم حفظ سعر الشحن'); }
        catch (err) { setResult(explain(err)); toast.error(explain(err)); }
        finally { setBusy(false); }
      }}>
        <h3 className="full">{zone.id ? 'تعديل سعر المحافظة' : 'إضافة منطقة شحن'}</h3>
        <label>المحافظة<select required value={zone.governorate || ''} onChange={e => setZone({ ...zone, governorate: e.target.value })}><option value="">اختر المحافظة</option>{[...new Set([...EGYPT_GOVERNORATES, ...zones.map(z => z.governorate)])].map(g => <option key={g} value={g}>{g}</option>)}</select></label>
        <label>السعر بالجنيه<input type="number" required min="0" step="0.01" value={(zone.fee_minor ?? 0) / 100} onChange={e => setZone({ ...zone, fee_minor: Math.round(Number(e.target.value) * 100) })}/></label>
        <label className="full">المناطق (اختياري — اتركها فارغة لو السعر موحد لكل المحافظة)<input value={areasText} onChange={e => setAreasText(e.target.value)}/></label>
        {zone.governorate && EGYPT_GOVERNORATES.includes(zone.governorate as (typeof EGYPT_GOVERNORATES)[number]) ? <p className="full muted small">المحافظة متاحة للطلبات دائمًا؛ يمكنك تعديل سعرها ومناطقها فقط.</p> : <label className="check-label"><input type="checkbox" checked={!!zone.is_active} onChange={e => setZone({ ...zone, is_active: e.target.checked })}/>متاح للعملاء في صفحة الطلب</label>}
        <div className="button-row full"><button className="btn" disabled={busy}>حفظ المحافظة</button><button type="button" className="btn outline" onClick={() => setZone(null)}>إلغاء</button></div>
      </form>}
    </section>

    <section className="panel"><h2>الإشعارات الخلفية للأجهزة</h2><label>مفتاح VAPID العام (مش المفتاح السري)<input dir="ltr" value={key} onChange={e => setKey(e.target.value)} placeholder="مفتاح VAPID العام"/></label><button className="btn" disabled={busy} onClick={async () => {
      setBusy(true);
      try { const d = await loadSite(true); if (d.version !== version) throw new Error('المحتوى اتعدل؛ حدّث الصفحة قبل الحفظ'); const next = await savePushKey(key.trim(), d.version); setVersion(next); toast.success('تم حفظ المفتاح العام ونشر الإعداد'); }
      catch (e) { setResult(explain(e)); }
      finally { setBusy(false); }
    }}>حفظ إعداد الإشعارات</button><p className="muted small">يلزم نشر homly-push وضبط VAPID وربط Database Webhook حسب دليل التحديث. بعد ذلك افتح الجرس واضغط «تفعيل إشعارات الجهاز». الصوت وظهور الإشعار يتأثران بصلاحيات الجهاز والمتصفح؛ على iPhone استخدم إضافة إلى الشاشة الرئيسية.</p></section>
    <section className="panel"><h2>الدفع والتواصل</h2><p>الدفع عند الاستلام فقط في هذه المرحلة. تأكيد واتساب بعد تسجيل الطلب لا يساوي دفعًا إلكترونيًا. رقم واتساب ونصوص الرسائل من «محتوى وتصميم المتجر ← واتساب».</p></section>
  </>;
}
