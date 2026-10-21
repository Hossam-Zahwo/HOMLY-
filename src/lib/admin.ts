import { supabase, configured } from './supabase';
export type AdminProfile = {
    id: string;
    full_name: string | null;
};
export async function getCurrentAdmin(): Promise<AdminProfile | null> { if (!configured)
    return null; const { data: { user } } = await supabase.auth.getUser(); if (!user)
    return null; const { data, error } = await supabase.rpc('homly_is_admin'); if (error || data !== true)
    return null; return { id: user.id, full_name: user.email || 'مدير المتجر' }; }
export async function signOutAdmin() { if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
        try {
            await supabase.rpc('homly_remove_push_subscription', { p_endpoint: sub.endpoint });
        }
        finally {
            await sub.unsubscribe();
        }
    }
} await supabase.auth.signOut(); }
