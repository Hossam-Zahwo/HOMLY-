import {useEffect} from 'react';
import {useLocation} from '@tanstack/react-router';

type Item = {item_id:string; item_name:string; price:number; quantity:number};
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  _fbq?: unknown;
};
const gaId = import.meta.env.VITE_GA4_MEASUREMENT_ID || 'G-C4D2XGGQVP';
const metaId = (import.meta.env.VITE_META_PIXEL_ID || '').trim();

function client(): AnalyticsWindow | null {
  return typeof window === 'undefined' ? null : window as AnalyticsWindow;
}
function google(event:string, params:Record<string,unknown>) {
  const w=client();
  if (!w || !gaId) return;
  w.dataLayer=w.dataLayer || [];
  if (!w.gtag) w.gtag=(...args:unknown[]) => {w.dataLayer!.push(args);};
  w.gtag('event',event,params);
}
function meta(event:string, params:Record<string,unknown>, eventId?:string) {
  const w=client();
  if (!metaId || !w?.fbq) return;
  if(eventId) w.fbq('track',event,params,{eventID:eventId});
  else w.fbq('track',event,params);
}
export function trackViewItem(item:Item) {
  google('view_item',{currency:'EGP',value:item.price,items:[item]});
  meta('ViewContent',{content_ids:[item.item_id],content_type:'product',content_name:item.item_name,value:item.price,currency:'EGP'});
}
export function trackAddToCart(item:Item) {
  google('add_to_cart',{currency:'EGP',value:item.price*item.quantity,items:[item]});
  meta('AddToCart',{content_ids:[item.item_id],content_type:'product',value:item.price*item.quantity,currency:'EGP',num_items:item.quantity});
}
export function trackBeginCheckout(items:Item[]) {
  const value=items.reduce((n,item)=>n+item.price*item.quantity,0);
  google('begin_checkout',{currency:'EGP',value,items});
  meta('InitiateCheckout',{currency:'EGP',value,content_ids:items.map(i=>i.item_id),content_type:'product',num_items:items.reduce((n,i)=>n+i.quantity,0)});
}
export function trackPurchase(order:{id:string;total_minor:number;shipping_minor:number;items?:Array<{variant_id?:string;title_snapshot?:string;quantity:number;unit_price_minor?:number;line_total_minor:number}>}) {
  const items=(order.items||[]).map(i=>({item_id:i.variant_id||'',item_name:i.title_snapshot||'',price:(i.unit_price_minor??(i.quantity?i.line_total_minor/i.quantity:0))/100,quantity:i.quantity}));
  const value=(order.total_minor-order.shipping_minor)/100;
  google('purchase',{transaction_id:order.id,currency:'EGP',value,shipping:order.shipping_minor/100,items});
  meta('Purchase',{currency:'EGP',value,content_ids:items.map(i=>i.item_id).filter(Boolean),content_type:'product',num_items:items.reduce((n,i)=>n+i.quantity,0)},order.id);
}
function initializeMeta() {
  const w=client();
  if(!w || !metaId || w.fbq) return;
  const queue: unknown[][]=[];
  const fbq=((...args:unknown[])=>{queue.push(args);}) as AnalyticsWindow['fbq'];
  w.fbq=fbq;
  w._fbq=fbq;
  const s=document.createElement('script');
  s.async=true;
  s.src='https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  w.fbq?.('init',metaId);
}
export function PixelRouteTracker() {
  const location=useLocation();
  useEffect(()=>{initializeMeta();},[]);
  useEffect(()=>{
    if(location.pathname.startsWith('/admin')) return;
    const page_path=location.pathname+location.searchStr;
    google('page_view',{page_path,page_location:window.location.href,page_title:document.title});
    meta('PageView',{});
  },[location.pathname,location.searchStr]);
  return null;
}
