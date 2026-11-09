import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Cloud, Database, ExternalLink, RefreshCw } from 'lucide-react';
import { AdminPage } from '@/components/AdminUI';
import { supabase } from '@/lib/supabase';
import '@/components/admin-usage.css';

export const Route = createFileRoute('/admin/usage')({
  component: () => <AdminPage><Usage /></AdminPage>,
});

type Bucket = { name: string; bytes: number; objects: number };
type UsageData = {
  fetchedAt: string;
  supabase: { databaseBytes: number; buckets: Bucket[] } | null;
  cloudinary: {
    status: string;
    credits?: number | null;
    creditLimit?: number | null;
    storageBytes?: number | null;
    bandwidthBytes?: number | null;
    transformations?: number | null;
    assets?: number | null;
  };
};

const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const format = (n?: number | null) => n == null ? '—' : number.format(n);
function bytes(n?: number | null) {
  if (n == null) return '—';
  if (n >= 1e9) return format(n / 1e9) + ' GB';
  if (n >= 1e6) return format(n / 1e6) + ' MB';
  if (n >= 1e3) return format(n / 1e3) + ' KB';
  return format(n) + ' B';
}

function Meter({ label, value, limit, size = false }: {
  label: string; value?: number | null; limit?: number | null; size?: boolean;
}) {
  const render = size ? bytes : format;
  const percent = value != null && limit && limit > 0 ? value / limit * 100 : null;
  return <div className="usage-meter">
    <div><strong>{label}</strong><bdi>{render(value)}{limit != null ? ' / ' + render(limit) : ''}</bdi></div>
    {percent != null && <progress aria-label={label} max={100} value={Math.min(percent, 100)} />}
  </div>;
}

function Usage() {
  const [data, setData] = useState<UsageData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('سجّل الدخول من جديد.');
        const response = await fetch('/api/admin/usage', {
          headers: { Authorization: 'Bearer ' + session.access_token },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'تعذر تحديث البيانات.');
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'تعذر تحديث البيانات.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void refresh();
    return () => controller.abort();
  }, [attempt]);

  const database = data?.supabase;
  const cloud = data?.cloudinary;
  const cloudMessages: Record<string, string> = {
    credentials: 'Cloudinary رفض بيانات الربط. راجع مفتاح الحساب والـ Secret على السيرفر.',
    unconfigured: 'إعدادات Cloudinary غير مكتملة.',
    unavailable: 'تعذر جلب أرقام Cloudinary حاليًا.',
  };

  return <section className="usage-page" aria-busy={loading}>
    <header className="usage-heading">
      <div><h1>التخزين والاستخدام</h1><p className="muted">تابع المساحة والاستهلاك لكل خدمة من مكان واحد.</p></div>
      <button className="btn" disabled={loading} onClick={() => {
        setError('');
        setLoading(true);
        setAttempt(value => value + 1);
      }}><RefreshCw size={17} />{loading ? 'جاري التحديث…' : 'تحديث البيانات'}</button>
    </header>
    {error && <p className="notice" role="alert">{error}</p>}
    {data && <p className="muted small">آخر جلب للبيانات <bdi>{new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
    }).format(new Date(data.fetchedAt))}</bdi></p>}
    <div className="usage-grid">
      <section className="panel usage-card">
        <header><Database aria-hidden="true" /><div><h2>Supabase</h2><p className="muted">قاعدة البيانات وتخزين الملفات</p></div></header>
        {database && <>
          <Meter label="قاعدة البيانات" value={database.databaseBytes} limit={500e6} size />
          <Meter label="تخزين ملفات المشروع" value={database.buckets.reduce((sum, bucket) => sum + bucket.bytes, 0)} size />
          <p className="muted small">حد قاعدة البيانات المعروض مرجع للخطة المجانية. حصة تخزين الملفات ونقل البيانات على مستوى المؤسسة.</p>
        </>}
        {data && !database && <p role="status">تعذر جلب قياسات المشروع.</p>}
        <a className="btn outline" href="https://supabase.com/dashboard/org/_/usage" target="_blank" rel="noreferrer"><ExternalLink size={16} />عرض الحصة ونقل البيانات</a>
      </section>
      <section className="panel usage-card">
        <header><Cloud aria-hidden="true" /><div><h2>Cloudinary</h2><p className="muted">الصور واستهلاك الرصيد</p></div></header>
        {cloud?.status === 'ok' && <>
          <Meter label="الرصيد المستهلك" value={cloud.credits} limit={cloud.creditLimit} />
          <Meter label="التخزين" value={cloud.storageBytes} size />
          <Meter label="نقل البيانات" value={cloud.bandwidthBytes} size />
          <Meter label="التحويلات" value={cloud.transformations} />
          <Meter label="الأصول" value={cloud.assets} />
        </>}
        {cloud && cloud.status !== 'ok' && <p role="status">{cloudMessages[cloud.status]}</p>}
        <a className="btn outline" href="https://console.cloudinary.com/" target="_blank" rel="noreferrer"><ExternalLink size={16} />فتح Cloudinary</a>
      </section>
    </div>
    {database && <section className="panel usage-details">
      <h2>تفاصيل تخزين Supabase</h2>
      {database.buckets.length ? <div className="table-wrap"><table>
        <thead><tr><th>حاوية التخزين</th><th>عدد الملفات</th><th>المساحة المستخدمة</th></tr></thead>
        <tbody>{database.buckets.map(bucket => <tr key={bucket.name}>
          <td><bdi>{bucket.name}</bdi></td><td><bdi>{format(bucket.objects)}</bdi></td><td><bdi>{bytes(bucket.bytes)}</bdi></td>
        </tr>)}</tbody>
      </table></div> : <p className="muted">مفيش حاويات تخزين في المشروع.</p>}
    </section>}
  </section>;
}
