import './AdminInstallHelp.css';

export function AdminInstallHelp({ initiallyOpen = false }: { initiallyOpen?: boolean } = {}) {
    return <details className="admin-install-help" open={initiallyOpen || undefined}>
        <summary>تثبيت إدارة هومي على الآيفون</summary>
        <ol>
            <li>افتح صفحة إدارة هومي في <strong>Safari</strong>.</li>
            <li>من <strong>مشاركة</strong> اختار <strong>إضافة إلى الشاشة الرئيسية</strong>.</li>
            <li>لو ظهر اختيار <strong>فتح كتطبيق ويب</strong>، فعّله واضغط <strong>إضافة</strong>.</li>
            <li>افتح أيقونة <strong>إدارة هومي</strong> من الشاشة الرئيسية، وسجّل دخولك.</li>
            <li>اضغط الجرس، ثم <strong>تفعيل إشعارات الجهاز</strong>، واختار <strong>سماح</strong>.</li>
        </ol>
        <small>إشعارات تطبيقات الويب تحتاج iOS 16.4 أو أحدث.</small>
    </details>;
}
