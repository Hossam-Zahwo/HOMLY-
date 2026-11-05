import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Package, Tags, ShoppingCart, Settings, FilePenLine,
  Star, Menu, X, Store, LogOut, Users, ChevronsRight, ChevronsLeft,
} from 'lucide-react';
import { getCurrentAdmin, signOutAdmin } from '@/lib/admin';
import { initializeStore } from '@/lib/initialize-store';
import { AdminNotifications } from './AdminNotifications';
import { Logo, ModeNotice } from './StoreUI';

const nav = [
  { to: '/admin', label: 'نظرة عامة', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'الطلبات', icon: ShoppingCart },
  { to: '/admin/products', label: 'المنتجات', icon: Package },
  { to: '/admin/categories', label: 'الأقسام', icon: Tags },
  { to: '/admin/customers', label: 'العملاء', icon: Users },
  { to: '/admin/reviews', label: 'التقييمات والمراجعة', icon: Star },
  { to: '/admin/content', label: 'محتوى وتصميم المتجر', icon: FilePenLine },
  { to: '/admin/settings', label: 'الإعدادات والربط', icon: Settings },
] as const;

const SIDEBAR_PREFERENCE = 'homey-admin-sidebar-collapsed';

export function AdminPage({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState('');
  const [setupWarning, setSetupWarning] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentAdmin().then(async admin => {
      if (!active) return;
      if (admin) {
        setAllowed(true);
        void initializeStore().catch(e => {
          if (active) setSetupWarning(e instanceof Error ? e.message : 'تعذر إكمال التهيئة');
        });
      } else {
        void navigate({ to: '/admin/login' });
      }
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'تعذر تجهيز المتجر');
    });
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(SIDEBAR_PREFERENCE) === '1'); }
    catch { /* Private browsing/storage restrictions should not break the admin layout. */ }
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia('(max-width: 900px)');
    const closeOnDesktop = () => { if (!media.matches) setOpen(false); };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const oldOverflow = document.body.style.overflow;
    if (media.matches) document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEscape);
    if (typeof media.addEventListener === 'function') media.addEventListener('change', closeOnDesktop);
    else media.addListener(closeOnDesktop);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onEscape);
      if (typeof media.removeEventListener === 'function') media.removeEventListener('change', closeOnDesktop);
      else media.removeListener(closeOnDesktop);
    };
  }, [open]);

  const toggleCollapsed = () => {
    setCollapsed(wasCollapsed => {
      const next = !wasCollapsed;
      try { window.localStorage.setItem(SIDEBAR_PREFERENCE, next ? '1' : '0'); }
      catch { /* Preserve the current toggle even if storage is unavailable. */ }
      return next;
    });
  };

  if (error) return (
    <div className="empty">
      <p>{error}</p>
      <button className="btn" onClick={() => window.location.reload()}>إعادة المحاولة</button>
    </div>
  );
  if (!allowed) return <div className="empty">جاري التحقق من الصلاحيات...</div>;

  const currentLabel = nav.find(item => item.to === location.pathname)?.label || 'لوحة التحكم';

  return (
    <div className={`admin-shell${collapsed ? ' admin-collapsed' : ''}`}>
      {open && (
        <button type="button" className="admin-scrim" aria-label="إغلاق قائمة الإدارة" onClick={() => setOpen(false)} />
      )}
      <aside id="homey-admin-sidebar" className={`admin-sidebar${open ? ' open' : ''}`} aria-label="القائمة الجانبية للإدارة">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-logo"><Logo /></div>
          <p className="admin-brand-caption">إدارة المتجر</p>
          <button type="button" className="admin-sidebar-close icon-button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>
        <div className="admin-sidebar-label">القائمة الرئيسية</div>
        <nav className="admin-sidebar-nav" aria-label="صفحات لوحة التحكم">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to as any}
              onClick={() => setOpen(false)}
              className={`admin-nav-link${location.pathname === to ? ' active' : ''}`}
              title={collapsed ? label : undefined}
              aria-label={label}
              aria-current={location.pathname === to ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
              <span className="admin-nav-link-text">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/" title="معاينة المتجر" aria-label="معاينة المتجر">
            <Store size={19} aria-hidden="true"/><span className="admin-sidebar-action-text">معاينة المتجر</span>
          </Link>
          <button type="button" onClick={async () => { await signOutAdmin(); void navigate({ to: '/admin/login' }); }} title="تسجيل الخروج" aria-label="تسجيل الخروج">
            <LogOut size={19} aria-hidden="true"/><span className="admin-sidebar-action-text">تسجيل الخروج</span>
          </button>
          <button type="button" className="admin-collapse-toggle" onClick={toggleCollapsed} aria-label={collapsed ? 'توسيع القائمة الجانبية' : 'تصغير القائمة الجانبية'} title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}>
            {collapsed ? <ChevronsLeft size={19} aria-hidden="true"/> : <ChevronsRight size={19} aria-hidden="true"/>}
            <span className="admin-sidebar-action-text">{collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}</span>
          </button>
        </div>
      </aside>
      <main className="admin-content">
        <header className="admin-top">
          <div className="admin-top-heading">
            <button
              type="button"
              className="admin-menu icon-button"
              aria-label="فتح قائمة الإدارة"
              aria-controls="homey-admin-sidebar"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu size={22}/>
            </button>
            <div className="admin-breadcrumb">
              <span className="admin-breadcrumb-root">هومي / لوحة التحكم</span>
              <span className="admin-breadcrumb-current">{currentLabel}</span>
            </div>
          </div>
          <div className="admin-top-actions">
            <AdminNotifications />
            <Link to="/" className="admin-visit-store"><Store size={17} aria-hidden="true"/>زيارة المتجر</Link>
          </div>
        </header>
        <ModeNotice />
        <div className="admin-body">
          {setupWarning && (
            <div role="status" className="notice">
              <p>لوحة الإدارة متاحة، لكن تهيئة البيانات لم تكتمل: {setupWarning}</p>
              <button className="btn outline" onClick={() => {
                setSetupWarning('جاري إعادة المحاولة…');
                void initializeStore().then(() => setSetupWarning('')).catch(e => setSetupWarning(e instanceof Error ? e.message : 'تعذر إكمال التهيئة'));
              }}>إعادة محاولة التهيئة</button>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
