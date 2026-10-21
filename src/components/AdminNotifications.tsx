import { useEffect, useRef, useState } from 'react';
import { Bell, Volume2, VolumeX, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSite } from '@/lib/site';
import { explain, date } from '@/lib/commerce';
import { toast } from 'sonner';
type Item = {
    id: string;
    title: string;
    body: string;
    url: string;
    created_at: string;
    is_read: boolean;
};
let audio: AudioContext | null = null;
let soundEnabled = false;
function beep() { if (!audio || audio.state !== 'running')
    return; const o = audio.createOscillator(); const g = audio.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(760, audio.currentTime); o.frequency.exponentialRampToValueAtTime(1050, audio.currentTime + .15); g.gain.setValueAtTime(.0001, audio.currentTime); g.gain.exponentialRampToValueAtTime(.12, audio.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .35); o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + .36); }
function bytes(key: string) { const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4)); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
export function AdminNotifications() {
    const { config } = useSite();
    const [items, setItems] = useState<Item[]>([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [sound, setSound] = useState(soundEnabled);
    const [push, setPush] = useState(false);
    const [notice, setNotice] = useState('');
    const [enabling, setEnabling] = useState(false);
    const previous = useRef(new Set<string>());
    const booted = useRef(false);
    const soundRef = useRef(false);
    const pushRef = useRef(false);
    useEffect(() => { soundRef.current = sound; }, [sound]);
    useEffect(() => { pushRef.current = push; }, [push]);
    useEffect(() => { let active = true; let running = false; const refresh = async () => { if (running)
        return; running = true; try {
        let list: Item[];
        let count: number;
        {
            const { data, error } = await supabase.rpc('homly_admin_inbox');
            if (error)
                throw error;
            list = data.items || [];
            count = data.unread_count || 0;
        }
        if (!active)
            return;
        if (booted.current) {
            for (const n of list) {
                if (previous.current.has(n.id) || n.is_read)
                    continue;
                const key = 'homy-alert-' + n.id;
                if (localStorage.getItem(key))
                    continue;
                localStorage.setItem(key, '1');
                toast(n.title, { description: n.body, action: { label: 'فتح', onClick: () => location.assign(n.url) } });
                if (soundRef.current)
                    beep();
                if (document.visibilityState !== 'visible' && !pushRef.current && 'Notification' in window && Notification.permission === 'granted')
                    new Notification(n.title, { body: n.body, icon: '/favicon.svg', tag: n.id });
            }
        }
        previous.current = new Set(list.map(n => n.id));
        booted.current = true;
        setItems(list);
        setUnread(count);
        const badge = navigator as Navigator & {
            setAppBadge?: (n: number) => Promise<void>;
            clearAppBadge?: () => Promise<void>;
        };
        if (count)
            void badge.setAppBadge?.(count);
        else
            void badge.clearAppBadge?.();
        setNotice('');
    }
    catch (e) {
        if (active)
            setNotice(explain(e));
    }
    finally {
        running = false;
    } }; void refresh(); const timer = setInterval(() => void refresh(), 20000); const listener = () => void refresh(); window.addEventListener('storage', listener); window.addEventListener('homy-notifications-changed', listener); window.addEventListener('focus', listener); const channel = supabase.channel('homy-admin-alerts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'homly_admin_notifications' }, listener).subscribe(); if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.register('/sw.js').then(async (registration) => { const sub = await registration.pushManager?.getSubscription(); if (active)
            setPush(!!sub); }).catch(() => { });
        navigator.serviceWorker.addEventListener('message', listener);
    } return () => { active = false; clearInterval(timer); window.removeEventListener('storage', listener); window.removeEventListener('homy-notifications-changed', listener); window.removeEventListener('focus', listener); navigator.serviceWorker?.removeEventListener('message', listener); if (channel)
        void supabase.removeChannel(channel); }; }, []);
    const mark = async (id?: string) => { try {
        {
            const { error } = await supabase.rpc('homly_mark_notifications_read', { p_id: id || null });
            if (error)
                throw error;
        }
        window.dispatchEvent(new Event('homy-notifications-changed'));
        if (id) {
            const n = items.find(x => x.id === id);
            if (n)
                location.assign(n.url);
        }
    }
    catch (e) {
        setNotice(explain(e));
    } };
    return <div className="admin-notification-wrap"><button className="icon-button notification-bell" aria-label={'الإشعارات غير المقروءة ' + unread} aria-expanded={open} onClick={() => setOpen(!open)}><Bell size={21}/>{unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}</button>{open && <aside className="notification-dropdown"><div className="section-head"><h3>الإشعارات</h3><button className="text-button" onClick={() => void mark()}><CheckCheck size={16}/>قراءة الكل</button></div><div className="button-row"><button className="btn compact outline" onClick={async () => { try {
        if (!audio)
            audio = new AudioContext();
        await audio.resume();
        soundEnabled = !sound;
        setSound(soundEnabled);
        if (soundEnabled)
            beep();
    }
    catch {
        setNotice('المتصفح لم يسمح بتشغيل الصوت. جرّب الضغط مرة أخرى.');
    } }}>{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>} {sound ? 'إيقاف الصوت' : 'تفعيل الصوت'}</button><button className="btn compact" disabled={enabling} onClick={async () => { setEnabling(true); setNotice(''); try {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window))
            throw new Error('الإشعارات الخلفية غير مدعومة هنا. على الآيفون افتح الموقع من أيقونة أضف إلى الشاشة الرئيسية.');
        if (!config.pushPublicKey)
            throw new Error('أضف مفتاح VAPID العام من إعدادات الإشعارات في الإدارة أولًا.');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted')
            throw new Error('اسمح بالإشعارات من إعدادات المتصفح.');
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub)
            sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(config.pushPublicKey) });
        const { error } = await supabase.rpc('homly_save_push_subscription', { p_subscription: sub.toJSON() });
        if (error)
            throw error;
        setPush(true);
        toast.success('تم تسجيل الجهاز للإشعارات الخلفية');
    }
    catch (e) {
        setNotice(explain(e));
    }
    finally {
        setEnabling(false);
    } }}>{push ? 'تجديد تفعيل إشعارات الجهاز' : 'تفعيل إشعارات الجهاز'}</button></div>{push && <button className="text-button" onClick={async () => { try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            const { error } = await supabase.rpc('homly_remove_push_subscription', { p_endpoint: sub.endpoint });
            if (error)
                throw error;
            await sub.unsubscribe();
        }
        setPush(false);
    }
    catch (e) {
        setNotice(explain(e));
    } }}>إلغاء إشعارات هذا الجهاز</button>}{notice && <p className="notice small">{notice}</p>}<p className="muted small">الصوت داخل الصفحة يحتاج ضغط تفعيل. الإشعارات عند إغلاق الموقع تحتاج إعداد Web Push على الخادم.</p><div className="notification-items">{items.map(n => <button className={'notification-item ' + (n.is_read ? '' : 'unread')} key={n.id} onClick={() => void mark(n.id)}><b>{n.title}</b><span>{n.body}</span><small>{date(n.created_at)}</small></button>)}{!items.length && <p className="muted">لا توجد إشعارات بعد.</p>}</div></aside>}</div>;
}
