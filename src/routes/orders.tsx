import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase, requireConnection } from '@/lib/supabase';
import { orders, type Order, money, date, statuses, explain } from '@/lib/commerce';
import { Notice } from '@/components/StoreUI';
import { useCopy } from '@/lib/site';
export const Route = createFileRoute('/orders')({ component: MyOrders });
function MyOrders() { const copy = useCopy(); const [list, setList] = useState<Order[]>([]); const [error, setError] = useState(''); const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); useEffect(() => { requireData(); async function requireData() { try {
    requireConnection();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return;
    const { data, error } = await supabase.from('homly_orders').select('id,code,total_minor,created_at,fulfillment_status').eq('user_id', user.id);
    if (error)
        throw error;
    setList((data || []) as Order[]);
}
catch (e) {
    setError(explain(e));
} } }, []); return <div className="wrap page"><h1>{copy('ordersTitle')}</h1>{error && <Notice>{error}</Notice>}{false}{list.length ? list.map(o => <article className="panel summary-line" key={o.id}><div><b dir="ltr">{o.code}</b><p className="muted">{date(o.created_at)}</p></div><span className="badge">{statuses[o.fulfillment_status]}</span><strong>{money(o.total_minor)}</strong></article>) : <div className="panel"><h2>متابعة طلبات حسابك</h2><p>تظهر الطلبات المرتبطة بحسابك بعد تسجيل الدخول. طلبات الضيوف لا تُكشف برقم الهاتف أو كود الطلب وحده.</p><form onSubmit={async (e) => { e.preventDefault(); setError(''); try {
    requireConnection();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/orders', shouldCreateUser: false } });
    if (error)
        throw error;
    setMessage('لو الحساب مسجل، هيوصلك رابط الدخول على البريد.');
}
catch (e) {
    setError(explain(e));
} }}><label>البريد الإلكتروني<input type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label><button className="btn">إرسال رابط الدخول</button></form>{message && <Notice kind="info">{message}</Notice>}<Link to="/products" className="text-button">{copy('continueShopping')}</Link></div>}</div>; }
