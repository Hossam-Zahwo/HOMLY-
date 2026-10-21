import { supabase, requireConnection } from './supabase';
import { orders, type Order } from './commerce';
export type Review = {
    id: string;
    order_id: string;
    order_item_id: string | null;
    product_id: string | null;
    target: 'site' | 'product';
    display_name: string;
    rating: number;
    comment: string;
    photo_paths: string[];
    photos: string[];
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
};
export type ReviewInviteInfo = {
    code: string;
    items: {
        id: string;
        product_id: string;
        title_snapshot: string;
        image_snapshot: string;
    }[];
    submitted: boolean;
};
export type ReviewInput = {
    order_item_id?: string;
    rating: number;
    comment: string;
    photo_paths: string[];
};
async function call(body: Record<string, unknown>) { requireConnection(); const { data, error } = await supabase.functions.invoke('homly-reviews', { body }); if (error)
    throw error; if (data?.error)
    throw new Error(data.error); return data; }
export async function inviteReview(order: Order) { const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n => n.toString(16).padStart(2, '0')).join(''); {
    const { error } = await supabase.rpc('homly_create_review_invite', { p_order_id: order.id, p_token: token });
    if (error)
        throw error;
} return window.location.origin + '/review/' + token; }
export async function reviewInfo(token: string): Promise<ReviewInviteInfo> { return (await call({ action: 'info', token })).info; }
export async function uploadReviewPhoto(token: string, file: File) { if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('صورة JPG أو PNG أو WebP، بحد أقصى 5MB'); ; const data = await call({ action: 'upload', token, mime: file.type, size: file.size }); const { error } = await supabase.storage.from('homly-review-images').uploadToSignedUrl(data.path, data.token, file, { contentType: file.type }); if (error)
    throw error; return data.path; }
export async function submitReviews(token: string, display_name: string, reviews: ReviewInput[]) { return call({ action: 'submit', token, display_name, reviews }); }
export async function publicReviews(productId?: string): Promise<Review[]> { return (await call({ action: 'list', product_id: productId || null })).reviews || []; }
export async function adminReviews(): Promise<Review[]> { const { data, error } = await supabase.from('homly_reviews').select('*,homly_review_photos(storage_path)').order('created_at', { ascending: false }); if (error)
    throw error; return await Promise.all((data || []).map(async (row) => { const paths = (row.homly_review_photos || []).map((p: any) => p.storage_path); const { data: signed } = paths.length ? await supabase.storage.from('homly-review-images').createSignedUrls(paths, 600) : { data: [] }; return { ...row, photo_paths: paths, photos: (signed || []).map(x => x.signedUrl).filter(Boolean) }; })); }
export async function moderateReview(id: string, status: Review['status']) { const { error } = await supabase.rpc('homly_moderate_review', { p_review_id: id, p_status: status }); if (error)
    throw error; }
