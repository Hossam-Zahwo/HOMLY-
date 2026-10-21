import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);

export const supabase = createClient(url || 'https://unconfigured.supabase.co', key || 'not-configured', { auth: { persistSession: true, autoRefreshToken: true } });
export function requireConnection() { if (!configured)
    throw new Error('أضف إعدادات Supabase الصحيحة في ملف .env.local. لا يتم عرض أو حفظ بيانات محلية.'); }
