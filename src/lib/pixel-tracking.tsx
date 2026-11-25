import {useEffect,useState} from 'react';
import {useLocation} from '@tanstack/react-router';

// Meta Pixel only. Never send customer names, phone numbers, addresses or email.
// The pixel is marketing tracking: activate it only after marketing consent.
// Store the value "granted" under this key from the site's privacy preferences.
export const MARKETING_CONSENT_KEY = 'homey_marketing_consent';
// Primary for campaign optimization; extra datasets receive the same permitted events.
const PRIMARY_META_PIXEL_ID = '1554969373320320';
const META_PIXEL_IDS = [PRIMARY_META_PIXEL_ID, '2330454391064281', '1062573933474128'] as const;
let initializedIds = new Set<string>();
const CURRENCY = 'EGP';
type Item = {item_id:string;item_name:string;price:number;quantity:number};
type PurchaseOrder = {
  id:string;
  total_minor:number;
  shipping_minor:number;
  items?:Array<{
    variant_id?:string;
    title_snapshot?:string;
    quantity:number;
    unit_price_minor?:number;
    line_total_minor:number;
  }>;
};
type Fbq = ((...args:unknown[])=>void)&{
  callMethod?: (...args:unknown[])=>void;
  queue?:unknown[][];
  loaded?:boolean;
  version?:string;
  push?:(args:unknown[])=>void;
};
declare global {
  interface Window {fbq?:Fbq;_fbq?:Fbq}
}
function allowed():boolean{
  if(typeof window==='undefined')return false;
  try{return window.localStorage.getItem(MARKETING_CONSENT_KEY)==='granted';}
  catch{return false;}
}
function init():boolean{
  if(!allowed())return false;
  if(!window.fbq){
    const fbq = function(...args:unknown[]){
      if(fbq.callMethod)fbq.callMethod(...args);
      else (fbq.queue??=[]).push(args);
    } as Fbq;
    fbq.queue=[];
    fbq.loaded=true;
    fbq.version='2.0';
    window.fbq=fbq;
    window._fbq=fbq;
    const script=document.createElement('script');
    script.async=true;
    script.src='https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  for(const id of META_PIXEL_IDS){
    if(!initializedIds.has(id)){
      window.fbq?.('init',id);
      initializedIds.add(id);
    }
  }
  window.fbq?.('consent','grant');
  return true;
}
function send(event:string,params:Record<string,unknown>,eventId?:string):void{
  if(!init())return;
  // trackSingle ensures every event targets exactly one specified dataset.
  for(const id of META_PIXEL_IDS){
    if(eventId)window.fbq?.('trackSingle',id,event,params,{eventID:eventId});
    else window.fbq?.('trackSingle',id,event,params);
  }
}
function price(n:number):number{
  return Number.isFinite(n)?Math.max(0,Math.round(n*100)/100):0;
}
export function trackViewItem(item:Item):void{
  send('ViewContent',{
    content_ids:[item.item_id],
    content_type:'product',
    content_name:item.item_name,
    value:price(item.price),
    currency:CURRENCY
  });
}
export function trackAddToCart(item:Item):void{
  send('AddToCart',{
    content_ids:[item.item_id],
    content_type:'product',
    contents:[{id:item.item_id,quantity:item.quantity}],
    value:price(item.price*item.quantity),
    currency:CURRENCY
  });
}
export function trackBeginCheckout(items:Item[]):void{
  if(!items.length)return;
  send('InitiateCheckout',{
    content_ids:items.map(x=>x.item_id),
    content_type:'product',
    contents:items.map(x=>({id:x.item_id,quantity:x.quantity})),
    num_items:items.reduce((s,x)=>s+x.quantity,0),
    value:price(items.reduce((s,x)=>s+x.price*x.quantity,0)),
    currency:CURRENCY
  });
}
export function trackPurchase(order:PurchaseOrder):void{
  if(!order.id || !allowed())return;
  // Prevent repeat Purchase when a success screen re-renders or is revisited.
  const key='homey_meta_purchase_'+order.id;
  try{
    if(window.sessionStorage.getItem(key)==='sent')return;
  }catch{/* storage can be disabled */}
  const items=order.items??[];
  send('Purchase',{
    content_ids:items.map(x=>x.variant_id).filter(Boolean),
    content_type:'product',
    contents:items.filter(x=>x.variant_id).map(x=>({id:x.variant_id,quantity:x.quantity})),
    num_items:items.reduce((s,x)=>s+x.quantity,0),
    value:price(order.total_minor/100),
    currency:CURRENCY
  },'homey-order-'+order.id);
  try{window.sessionStorage.setItem(key,'sent');}catch{/* storage can be disabled */}
}
export function PixelRouteTracker(){
  const location=useLocation();
  useEffect(()=>{
    const pageview=()=>send('PageView',{});
    pageview();
    // Listen even before consent, otherwise opting in does not activate tracking.
    window.addEventListener('homey-marketing-consent-changed',pageview);
    return ()=>window.removeEventListener('homey-marketing-consent-changed',pageview);
  },[location.pathname,location.searchStr]);
  return null;
}

/** Optional privacy preference entry point; never shows an unsolicited banner. */
export function MarketingPrivacyControl(){
  const [open,setOpen]=useState(false);
  const [enabled,setEnabled]=useState(false);
  useEffect(()=>{
    setEnabled(allowed());
  },[open]);
  function choose(grant:boolean){
    try{window.localStorage.setItem(MARKETING_CONSENT_KEY,grant?'granted':'denied');}
    catch{/* private browsing can block localStorage */}
    setEnabled(grant);
    setOpen(false);
    if(grant)window.dispatchEvent(new Event('homey-marketing-consent-changed'));
    else window.fbq?.('consent','revoke');
  }
  return <span className="homey-privacy-control">
    <button type="button" className="homey-policy-link" onClick={()=>setOpen(true)}>إعدادات الخصوصية</button>
    {open&&<span role="dialog" aria-modal="true" aria-label="إعدادات خصوصية الإعلانات" style={{display:'block',padding:'12px',background:'#fff',color:'#222',border:'1px solid #ddd',borderRadius:8,maxWidth:320}}>
      <strong>تفضيلات قياس الإعلانات</strong>
      <p>هل تسمح باستخدام أدوات Meta لقياس زيارات المنتجات والطلبات وتحسين الإعلانات؟ اختيارك لا يؤثر على إتمام الطلب.</p>
      <p>الحالة الحالية: {enabled?'مسموح':'غير مسموح'}</p>
      <button type="button" onClick={()=>choose(true)}>السماح</button>{' '}
      <button type="button" onClick={()=>choose(false)}>رفض</button>{' '}
      <button type="button" onClick={()=>setOpen(false)}>إغلاق</button>
    </span>}
  </span>;
}
