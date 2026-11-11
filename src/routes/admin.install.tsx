import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AdminInstallHelp } from '@/components/AdminInstallHelp';
import { Logo } from '@/components/StoreUI';

interface InstallPrompt extends Event {
    prompt(): Promise<unknown>;
}

type InstallWindow = Window & { homeyAdminInstallPrompt?: InstallPrompt };
type InstallNavigator = Navigator & { standalone?: boolean; install?: () => Promise<unknown> };

export const Route = createFileRoute('/admin/install')({
    head: () => ({
        meta: [{ title: 'تثبيت إدارة هومي' }, { name: 'robots', content: 'noindex, nofollow' }],
        scripts: [{ src: '/admin-install.js' }],
    }),
    component: InstallAdmin,
});

function InstallAdmin() {
    const [canInstall, setCanInstall] = useState(false);
    const [installError, setInstallError] = useState(false);

    useEffect(() => {
        const browser = navigator as InstallNavigator;
        if (browser.standalone || window.matchMedia('(display-mode: standalone)').matches) {
            window.location.replace('/admin/orders');
            return;
        }
        const syncInstall = () => setCanInstall(Boolean(
            (window as InstallWindow).homeyAdminInstallPrompt || typeof browser.install === 'function'
        ));
        window.addEventListener('homey-admin-install-ready', syncInstall);
        syncInstall();
        if ('serviceWorker' in navigator) {
            void navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
        return () => window.removeEventListener('homey-admin-install-ready', syncInstall);
    }, []);

    return <main className="login-page">
        <section className="login-panel">
            <Logo/>
            <h1>تثبيت إدارة هومي</h1>
            <p className="muted">أيقونة «إدارة هومي» بتفتح لوحة الطلبات بعد تسجيل الدخول.</p>
            {canInstall && <button type="button" className="btn" onClick={async () => {
                const installWindow = window as InstallWindow;
                const prompt = installWindow.homeyAdminInstallPrompt;
                const browser = navigator as InstallNavigator;
                setInstallError(false);
                try {
                    if (prompt) {
                        delete installWindow.homeyAdminInstallPrompt;
                        setCanInstall(typeof browser.install === 'function');
                        await prompt.prompt();
                    } else {
                        await browser.install?.();
                    }
                } catch {
                    setInstallError(true);
                }
            }}>تثبيت إدارة هومي</button>}
            {installError && <p role="status">استخدم خيار تثبيت التطبيق من قائمة المتصفح بالخطوات تحت.</p>}
            <AdminInstallHelp initiallyOpen/>
            <p><strong>أندرويد:</strong> افتح الصفحة في Chrome، ومن القائمة اختار «إضافة إلى الشاشة الرئيسية»، وبعدها <strong>تثبيت</strong> لو ظهرت الاختيارات.</p>
            <p><strong>ويندوز:</strong> في Chrome اختار <strong>تثبيت الصفحة كتطبيق</strong>. في Edge اختار <strong>التطبيقات ← تثبيت هذا الموقع كتطبيق</strong>.</p>
            <Link to="/admin/orders" search={{ order: undefined }} className="text-button">فتح لوحة الطلبات</Link>
        </section>
    </main>;
}
