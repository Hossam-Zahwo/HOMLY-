import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminPage } from '@/components/AdminUI';
import { Notice } from '@/components/StoreUI';
import { configured } from '@/lib/supabase';
import { catalog, shippingZones, saveZone, explain, type Zone } from '@/lib/commerce';
import { loadSite, savePushKey } from '@/lib/site';
export const Route = createFileRoute('/admin/settings')({ component: () => <AdminPage><Settings /></AdminPage> });
function Settings() { const [result, setResult] = useState(''); const [busy, setBusy] = useState(false); const [zones, setZones] = useState<Zone[]>([]); const [zone, setZone] = useState<Partial<Zone> | null>(null); const [key, setKey] = useState(''); const [version, setVersion] = useState(0); const load = () => shippingZones(true).then(setZones).catch(e => setResult(explain(e))); useEffect(() => { void load(); loadSite(true).then(d => { setKey(d.config.pushPublicKey); setVersion(d.version); }).catch(() => { }); }, []); return <><h1>إعدادات المتجر والربط</h1><section className="panel"><h2>حالة الاتصال</h2><p>{configured ? 'إعدادات Supabase موجودة' : 'أضف إعدادات Supabase في البيئة'}</p><button className="btn outline" disabled={busy} onClick={async () => { setBusy(true); try {
    const [c, z] = await Promise.all([catalog(), shippingZones()]);
    setResult('نجحت القراءة: ' + c.products.length + ' عائلة و' + z.length + ' منطقة شحن.');
}
catch (e) {
    setResult(explain(e));
}
finally {
    setBusy(false);
} }}>اختبار القراءة</button>{result && <Notice kind="info">{result}</Notice>}</section><section className="panel"><div className="section-head"><h2>مناطق وأسعار الشحن</h2><button className="btn" onClick={() => setZone({ governorate: '', areas: [], fee_minor: 0, is_active: true })}>إضافة منطقة</button></div>{zones.map(z => <div className="summary-line" key={z.id}><span>{z.governorate} {z.areas.join(' / ')} — {z.fee_minor / 100} ج.م {z.is_active ? '' : '(مخفية)'}</span><button className="btn outline compact" onClick={() => setZone(z)}>تعديل</button></div>)}{zone && <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
    await saveZone(zone);
    setZone(null);
    await load();
    toast.success('تم حفظ الشحن');
}
catch (e) {
    setResult(explain(e));
}
finally {
    setBusy(false);
} }}><label>المحافظة<input required value={zone.governorate || ''} onChange={e => setZone({ ...zone, governorate: e.target.value })}/></label><label>السعر بالجنيه<input type="number" required min="0" step="0.01" value={(zone.fee_minor || 0) / 100} onChange={e => setZone({ ...zone, fee_minor: Math.round(Number(e.target.value) * 100) })}/></label><label className="full">المناطق (اتركها فارغة لكل المحافظة، أو افصل بفاصلة)<input defaultValue={zone.areas?.join('، ')} key={zone.id || 'new'} onBlur={e => setZone({ ...zone, areas: e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean) })}/></label><label className="check-label"><input type="checkbox" checked={!!zone.is_active} onChange={e => setZone({ ...zone, is_active: e.target.checked })}/>منطقة فعالة — إلغاء العلامة يخفيها</label><div className="button-row"><button className="btn" disabled={busy}>حفظ</button><button type="button" className="btn outline" onClick={() => setZone(null)}>إلغاء</button></div></form>}</section><section className="panel"><h2>الإشعارات الخلفية للأجهزة</h2><label>مفتاح VAPID العام (مش المفتاح السري)<input dir="ltr" value={key} onChange={e => setKey(e.target.value)} placeholder="مفتاح VAPID العام"/></label><button className="btn" disabled={busy} onClick={async () => { setBusy(true); try {
    const d = await loadSite(true);
    if (d.version !== version)
        throw new Error('المحتوى اتعدل؛ حدّث الصفحة قبل الحفظ');
    const next = await savePushKey(key.trim(), d.version);
    setVersion(next);
    toast.success('تم حفظ المفتاح العام ونشر الإعداد');
}
catch (e) {
    setResult(explain(e));
}
finally {
    setBusy(false);
} }}>حفظ إعداد الإشعارات</button><p className="muted small">يلزم نشر homly-push وضبط VAPID وربط Database Webhook حسب دليل التحديث. بعد ذلك افتح الجرس واضغط «تفعيل إشعارات الجهاز». الصوت وظهور الإشعار يتأثران بصلاحيات الجهاز والمتصفح؛ على iPhone استخدم إضافة إلى الشاشة الرئيسية.</p></section><section className="panel"><h2>الدفع والتواصل</h2><p>الدفع عند الاستلام فقط في هذه المرحلة. تأكيد واتساب بعد تسجيل الطلب لا يساوي دفعًا إلكترونيًا. رقم واتساب ونصوص الرسائل من «محتوى وتصميم المتجر ← واتساب».</p></section></>; }
