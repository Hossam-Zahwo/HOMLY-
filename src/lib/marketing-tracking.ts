/** HOMEY analytics. Browser events only; no customer personal information. */
export type TrackingItem = {id:string; name:string; priceMinor:number; quantity:number};
type TrackingWindow = Window & {gtag?: (...args:any[])=>void; fbq?: (...args:any[])=>void; _fbq?:unknown};
const pixelId = import.meta.env.VITE_META_PIXEL_ID?.trim();
const enabled = import.meta.env.VITE_MARKETING_TRACKING_ENABLED === 'true';
const consentKey='homey-marketing-consent';
const hasConsent=()=>typeof window!=='undefined' && window.localStorage.getItem(consentKey)==='granted';
export function setMarketingConsent(allowed:boolean){
 if(typeof window==='undefined')return;
 window.localStorage.setItem(consentKey,allowed?'granted':'denied');
 if(allowed){initializeMetaPixel();trackNavigation();}
}
export function marketingConsent(): 'granted'|'denied'|'unset' {
 if(typeof window==='undefined')return 'unset';
 const value=window.localStorage.getItem(consentKey);
 return value==='granted'||value==='denied'?value:'unset';
}
const currency = 'EGP';
const minorToEgp=(value:number)=>Number((value/100).toFixed(2));
const item=(p:TrackingItem)=>({item_id:p.id,item_name:p.name,price:minorToEgp(p.priceMinor),quantity:p.quantity});
const ga=(event:string,data:Record<string,unknown>)=>{if(typeof window!=='undefined'&&enabled&&hasConsent())(window as TrackingWindow).gtag?.('event',event,data)};
const meta=(event:string,data:Record<string,unknown>,eventId?:string)=>{
  if(typeof window==='undefined'||!enabled||!pixelId||!hasConsent())return;
  const fbq=(window as TrackingWindow).fbq;
  if(eventId)fbq?.('track',event,data,{eventID:eventId});else fbq?.('track',event,data);
};
export function initializeMetaPixel(){
 if(typeof window==='undefined'||!enabled||!pixelId||!hasConsent()||!/^\d{8,20}$/.test(pixelId))return;
 const w=window as TrackingWindow;
 if(w.fbq)return;
 const fbq:any=function(...args:unknown[]){if(fbq.callMethod)fbq.callMethod.apply(fbq,args);else fbq.queue.push(args)};
 fbq.queue=[];fbq.loaded=true;fbq.version='2.0';
 w.fbq=fbq;w._fbq=fbq;
 const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(script);
 fbq('init',pixelId);
}
export function trackNavigation(){
 if(typeof window==='undefined'||!enabled||!hasConsent())return;
 ga('page_view',{page_location:window.location.href,page_path:window.location.pathname+window.location.search});
 meta('PageView',{});
}
export function trackProductView(p:TrackingItem){
 const value=minorToEgp(p.priceMinor);
 ga('view_item',{currency,value,items:[item(p)]});
 meta('ViewContent',{content_ids:[p.id],content_type:'product',content_name:p.name,currency,value});
}
export function trackCartAdd(p:TrackingItem){
 const value=minorToEgp(p.priceMinor*p.quantity);
 ga('add_to_cart',{currency,value,items:[item(p)]});
 meta('AddToCart',{content_ids:[p.id],content_type:'product',contents:[{id:p.id,quantity:p.quantity}],currency,value});
}
export function trackCheckoutStart(items:TrackingItem[]){
 if(!items.length)return;
 const value=minorToEgp(items.reduce((s,p)=>s+p.priceMinor*p.quantity,0));
 ga('begin_checkout',{currency,value,items:items.map(item)});
 meta('InitiateCheckout',{content_ids:items.map(p=>p.id),content_type:'product',currency,value,num_items:items.reduce((s,p)=>s+p.quantity,0)});
}
export function trackConfirmedPurchase(order:{id:string;totalMinor:number},items:TrackingItem[]){
 if(typeof window==='undefined'||!enabled||!hasConsent()||!order.id||!Number.isFinite(order.totalMinor))return;
 const eventId='homey-purchase-'+order.id;
 const key='homey-marketing-'+eventId;
 try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{}
 const value=minorToEgp(order.totalMinor);
 ga('purchase',{transaction_id:order.id,currency,value,items:items.map(item)});
 meta('Purchase',{content_ids:items.map(p=>p.id),contents:items.map(p=>({id:p.id,quantity:p.quantity})),content_type:'product',currency,value},eventId);
}
