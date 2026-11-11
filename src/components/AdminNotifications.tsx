import { useEffect, useRef, useState } from 'react';
import { Bell, Volume2, VolumeX, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSite } from '@/lib/site';
import { explain, date } from '@/lib/commerce';
import { toast } from 'sonner';
import { AdminInstallHelp } from './AdminInstallHelp';
type Item = {
    id: string;
    title: string;
    body: string;
    url: string;
    created_at: string;
    is_read: boolean;
};
let audio: AudioContext | null = null;
let soundEnabled = true;
const soundPreference = 'homey-admin-notification-sound';
const sounded = new Set<string>();
async function unlockSound() {
    audio ??= new AudioContext();
    if (audio.state !== 'running') await audio.resume();
}
function soundFor(id: string) {
    if (!soundEnabled || !audio || audio.state !== 'running' || sounded.has(id)) return;
    if (sounded.size >= 200) sounded.clear();
    sounded.add(id);
    beep();
}
function beep() {
    const context = audio;
    if (!context || context.state !== 'running') return;

    const start = context.currentTime;
    const notes = [880, 1175, 1568];
    for (const [index, frequency] of notes.entries()) {
        const time = start + index * 0.21;
        const oscillator = context.createOscillator();
        const volume = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, time);
        volume.gain.setValueAtTime(0.0001, time);
        volume.gain.exponentialRampToValueAtTime(0.56, time + 0.012);
        volume.gain.setValueAtTime(0.56, time + 0.09);
        volume.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
        oscillator.connect(volume);
        volume.connect(context.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.2);
    }
}
function bytes(key: string) { const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4)); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
export function AdminNotifications() {
    const { config } = useSite();
    const [items, setItems] = useState<Item[]>([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [sound, setSound] = useState(false);
    const [push, setPush] = useState(false);
    const [notice, setNotice] = useState('');
    const [enabling, setEnabling] = useState(false);
    const previous = useRef(new Set<string>());
    const booted = useRef(false);
    const registration = useRef<ServiceWorkerRegistration | null>(null);
    const subscription = useRef<PushSubscription | null>(null);
    useEffect(() => {
        try { soundEnabled = localStorage.getItem(soundPreference) !== 'off'; } catch {}
        setSound(soundEnabled && audio?.state === 'running');
        const unlock = () => {
            if (soundEnabled) void unlockSound().then(() => setSound(soundEnabled)).catch(() => {});
        };
        window.addEventListener('click', unlock, true);
        window.addEventListener('keydown', unlock, true);
        return () => {
            window.removeEventListener('click', unlock, true);
            window.removeEventListener('keydown', unlock, true);
        };
    }, []);
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
                soundFor(n.id);
                if (localStorage.getItem(key))
                    continue;
                localStorage.setItem(key, '1');
                toast(n.title, { description: n.body, action: { label: 'فتح', onClick: () => location.assign(n.url) } });
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
            void badge.setAppBadge?.(count).catch(() => {});
        else
            void badge.clearAppBadge?.().catch(() => {});
    }
    catch (e) {
        if (active)
            setNotice(explain(e));
    }
    finally {
        running = false;
    } };
    const onPush = (event: MessageEvent) => {
        if (event.data?.type !== 'homy-notification') return;
        if (typeof event.data.id === 'string') soundFor(event.data.id);
        void refresh();
    };
    void refresh(); const timer = setInterval(() => void refresh(), 20000); const listener = () => void refresh(); window.addEventListener('storage', listener); window.addEventListener('homy-notifications-changed', listener); window.addEventListener('focus', listener); const channel = supabase.channel('homy-admin-alerts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'homly_admin_notifications' }, listener).subscribe(); if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(async reg => {
            if (!active) return;
            registration.current = reg;
            const sub = await reg.pushManager?.getSubscription();
            if (!active || !sub || Notification.permission !== 'granted') return;
            subscription.current = sub;
            const { error } = await supabase.rpc('homly_save_push_subscription', { p_subscription: sub.toJSON() });
            if (active && !error) setPush(true);
        }).catch(() => {});
        navigator.serviceWorker.addEventListener('message', onPush);
    } return () => { active = false; clearInterval(timer); window.removeEventListener('storage', listener); window.removeEventListener('homy-notifications-changed', listener); window.removeEventListener('focus', listener); navigator.serviceWorker?.removeEventListener('message', onPush); if (channel)
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
        const enable = !sound;
        soundEnabled = enable;
        try { localStorage.setItem(soundPreference, enable ? 'on' : 'off'); } catch {}
        if (enable) {
            await unlockSound();
            beep();
        }
        setSound(enable);
    }
    catch {
        setNotice('المتصفح لم يسمح بتشغيل الصوت. جرّب الضغط مرة أخرى.');
    } }}>{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>} {sound ? 'إيقاف الصوت' : 'تفعيل الصوت'}</button>{sound && <button type="button" className="text-button" onClick={() => {
        void unlockSound().then(beep).catch(() => setNotice('المتصفح لم يسمح بتشغيل الصوت.'));
    }}>اختبار الصوت</button>}<button className="btn compact" disabled={enabling} onClick={async () => { setEnabling(true); setNotice(''); try {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window))
            throw new Error('على الآيفون ثبّت إدارة هومي على الشاشة الرئيسية وافتحها من الأيقونة لتفعيل الإشعارات.');
        if (Notification.permission === 'denied')
            throw new Error('الإشعارات مقفولة. اسمح بها لإدارة هومي من إعدادات الجهاز أو المتصفح.');
        if (!config.pushPublicKey || !registration.current)
            throw new Error('الإشعارات لسه بتتجهز. انتظر لحظات واضغط تفعيل مرة تانية.');
        const reg = registration.current;
        const applicationServerKey = bytes(config.pushPublicKey);
        let sub = subscription.current;
        const storedKey = sub?.options.applicationServerKey;
        const existingKey = storedKey ? new Uint8Array(storedKey) : null;
        if (sub && existingKey && (existingKey.length !== applicationServerKey.length || !applicationServerKey.every((value, index) => existingKey[index] === value))) {
            await sub.unsubscribe();
            subscription.current = null;
            throw new Error('تم تحديث إعداد الإشعارات. اضغط تفعيل مرة تانية لتسجيل الجهاز.');
        }
        // Start subscribe inside the click, while iOS still has user activation.
        sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        subscription.current = sub;
        const { error } = await supabase.rpc('homly_save_push_subscription', { p_subscription: sub.toJSON() });
        if (error) throw error;
        setPush(true);
        toast.success('تم تسجيل الجهاز للإشعارات الخلفية');
    }
    catch (e) {
        setNotice(explain(e));
    }
    finally {
        setEnabling(false);
    } }}>{push ? 'تجديد تفعيل إشعارات الجهاز' : 'تفعيل إشعارات الجهاز'}</button></div>{push && <button className="text-button" onClick={async () => { try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            const { error } = await supabase.rpc('homly_remove_push_subscription', { p_endpoint: sub.endpoint });
            if (error)
                throw error;
            await sub.unsubscribe();
            subscription.current = null;
        }
        setPush(false);
    }
    catch (e) {
        setNotice(explain(e));
    } }}>إلغاء إشعارات هذا الجهاز</button>}{notice && <p className="notice small">{notice}</p>}{push && <button type="button" className="text-button" onClick={async () => {
        try {
            const reg = registration.current;
            if (!reg || Notification.permission !== 'granted') throw new Error('فعّل إشعارات الجهاز الأول.');
            await reg.showNotification('اختبار إشعار إدارة هومي', {
                body: 'ده اختبار لإشعارات الجهاز.',
                icon: '/icon-192.png',
                tag: 'homey-admin-test',
                silent: false,
                data: { url: new URL('/admin/orders', location.origin).href },
            });
        } catch (e) {
            setNotice(explain(e));
        }
    }}>اختبار إشعار الجهاز</button>}<AdminInstallHelp/><p className="muted small">على أندرويد، صوت الإشعار واللوحة مقفولة بيتحدد من إعدادات إشعارات إدارة هومي أو Chrome وصوت الإشعارات في الجهاز.</p><div className="notification-items">{items.map(n => <button className={'notification-item ' + (n.is_read ? '' : 'unread')} key={n.id} onClick={() => void mark(n.id)}><b>{n.title}</b><span>{n.body}</span><small>{date(n.created_at)}</small></button>)}{!items.length && <p className="muted">لا توجد إشعارات بعد.</p>}</div></aside>}</div>;
}
