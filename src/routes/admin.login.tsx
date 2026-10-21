import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Logo, ModeNotice, Notice } from '@/components/StoreUI';
import { supabase, requireConnection } from '@/lib/supabase';
import { getCurrentAdmin } from '@/lib/admin';
import { explain } from '@/lib/commerce';
export const Route = createFileRoute('/admin/login')({ component: Login });
function Login() { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate(); useEffect(() => { void getCurrentAdmin().then(a => { if (a)
    void navigate({ to: '/admin' }); }); }, [navigate]); return <div className="login-page"><ModeNotice /><div className="login-panel"><Logo /><h1>أهلًا بيك في إدارة هومي</h1><p className="muted">ادخل بحساب المدير المرتبط بـSupabase</p>{<form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
    requireConnection();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw error;
    if (!await getCurrentAdmin()) {
        await supabase.auth.signOut();
        throw new Error('الحساب لا يملك صلاحية إدارة هومي، أو وظيفة التحقق تحتاج تهيئة SQL.');
    }
    void navigate({ to: '/admin' });
}
catch (e) {
    setError(explain(e));
}
finally {
    setBusy(false);
} }}><label>البريد الإلكتروني<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required/></label><label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required/></label><button className="btn" disabled={busy}>{busy ? 'جاري التحقق...' : 'تسجيل الدخول'}</button></form>}{error && <Notice>{error}</Notice>}<Link to="/" className="text-button">العودة للمتجر</Link></div></div>; }
