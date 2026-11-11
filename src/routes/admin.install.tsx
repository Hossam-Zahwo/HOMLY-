import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AdminInstallHelp } from '@/components/AdminInstallHelp';
import { Logo } from '@/components/StoreUI';

interface InstallPrompt extends Event {
    prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const Route = createFileRoute('/admin/install')({
    head: () => ({
        meta: [{ title: 'تثبيت إدارة هومي' }, { name: 'robots', content: 'noindex, nofollow' }],
    }),
    component: InstallAdmin,
});

function InstallAdmin() {
    const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

    useEffect(() => {
        const ios = navigator as Navigator & { standalone?: boolean };
        if (ios.standalone || window.matchMedia('(display-mode: standalone)').matches) {
            window.location.replace('/admin/orders');
            return;
        }
        const offerInstall = (event: Event) => {
            event.preventDefault();
            setPrompt(event as InstallPrompt);
        };
        const installed = () => setPrompt(null);
        window.addEventListener('beforeinstallprompt', offerInstall);
        window.addEventListener('appinstalled', installed);
        if ('serviceWorker' in navigator) {
            void navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
        return () => {
            window.removeEventListener('beforeinstallprompt', offerInstall);
            window.removeEventListener('appinstalled', installed);
        };
    }, []);

    return <main className="login-page">
        <section className="login-panel">
            <Logo/>
            <h1>تثبيت إدارة هومي</h1>
            <p className="muted">أيقونة «إدارة هومي» بتفتح لوحة الطلبات بعد تسجيل الدخول.</p>
            {prompt && <button type="button" className="btn" onClick={() => {
                setPrompt(null);
                void prompt.prompt().catch(() => {});
            }}>تثبيت إدارة هومي</button>}
            <AdminInstallHelp initiallyOpen/>
            <p>على أندرويد، افتح قائمة Chrome واختار <strong>تثبيت التطبيق</strong>.</p>
            <Link to="/admin/orders" search={{ order: undefined }} className="text-button">فتح لوحة الطلبات</Link>
        </section>
    </main>;
}
