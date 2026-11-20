// Optional marketing tracking is temporarily disabled while the storefront has no
// customer-facing consent mechanism. Do not initialize GA4, Meta, or TikTok here.
type Item = {item_id:string; item_name:string; price:number; quantity:number};
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
export function trackViewItem(_item:Item):void {}
export function trackAddToCart(_item:Item):void {}
export function trackBeginCheckout(_items:Item[]):void {}
export function trackPurchase(_order:PurchaseOrder):void {}
export function PixelRouteTracker(){return null;}
