import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, requireConnection } from './supabase';
import { defaultSite, normalizeSite, type SiteConfig } from './content-model';
import { getCurrentAdmin } from './admin';
export async function loadSite(draft = false): Promise<{
    config: SiteConfig;
    version: number;
}> { requireConnection(); const { data, error } = await supabase.from(draft ? 'homly_site_drafts' : 'homly_site_content').select('config,version').eq('id', 'main').maybeSingle(); if (error)
    throw error; if(draft&&!data){const published=await loadSite(false);return {config:published.config,version:0}} return { config: normalizeSite(data?.config), version: data?.version || 0 }; }
export async function saveSite(config: SiteConfig, publish: boolean, version: number) { requireConnection(); const { data, error } = await supabase.rpc('homly_save_site_content', { p_config: config, p_publish: publish, p_expected_version: version }); if (error)
    throw error; window.dispatchEvent(new Event('homy-content-changed')); if(data===null||!Number.isInteger(Number(data))||Number(data)<=version)throw new Error('لم يصل تأكيد حفظ نسخة المحتوى؛ أعد تحميل البيانات قبل المحاولة');return Number(data); }
const Context = createContext({ config: defaultSite, preview: false, error: '', loading: true });
export function SiteProvider({ children }: {
    children: ReactNode;
}) { const [config, setConfig] = useState(defaultSite); const [preview, setPreview] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); useEffect(() => { let active = true; let channel: ReturnType<typeof supabase.channel> | null = null; const load = async () => { try {
    const wantsPreview = new URLSearchParams(location.search).get('content_preview') === '1';
    const canPreview = wantsPreview && Boolean(await getCurrentAdmin());
    const d = await loadSite(canPreview);
    if (active) {
        setConfig(d.config);
        setPreview(canPreview);
        setError('');setLoading(false);
    }
}
catch {
    if (active) {setConfig(defaultSite);setError('تعذر تحميل محتوى المتجر من قاعدة البيانات. أعد المحاولة.');setLoading(false);}
} }; void load(); window.addEventListener('homy-content-changed', load); window.addEventListener('storage', load); channel = supabase.channel('homy-site-content').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'homly_site_content' }, load).subscribe(); return () => { active = false; window.removeEventListener('homy-content-changed', load); window.removeEventListener('storage', load); if (channel)
    void supabase.removeChannel(channel); }; }, []); useEffect(() => { if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/product/')) document.title = config.brand.name + ' | ' + config.brand.tagline; const root = document.documentElement; root.style.setProperty('--sage', /^#[0-9a-f]{6}$/i.test(config.style.primary) ? config.style.primary : '#687664'); root.style.setProperty('--site-bg', config.style.background); root.style.setProperty('--site-text', config.style.text); root.style.setProperty('--image-radius', Math.min(32, Math.max(0, config.style.radius)) + 'px'); root.style.setProperty('--section-space', Math.min(80, Math.max(16, config.style.spacing)) + 'px'); root.dataset.motion = String(config.style.motion); }, [config.style, config.brand]); return <Context.Provider value={{ config, preview, error, loading }}>{children}</Context.Provider>; }
export const useSite = () => useContext(Context);
export function useCopy() { const { config } = useSite(); return (key: string, fallback = '') => config.labels[key] || fallback; }
export async function savePushKey(key: string, version: number) { requireConnection(); const { data, error } = await supabase.rpc('homly_save_push_public_key', { p_key: key, p_expected_version: version }); if (error)
    throw error; window.dispatchEvent(new Event('homy-content-changed')); if(data===null||!Number.isInteger(Number(data))||Number(data)<=version)throw new Error('لم يصل تأكيد حفظ نسخة المحتوى؛ أعد تحميل البيانات قبل المحاولة');return Number(data); }
