export type CustomerContact={customer_name:string;customer_phone:string;governorate?:string;shipping_zone_id?:string;area:string;address:string;customer_notes:string};
const KEY='homy-customer-contact-v1';
export function rememberedContact():CustomerContact|null{try{const value=JSON.parse(localStorage.getItem(KEY)||'null');if(!value||['customer_name','customer_phone','area','address','customer_notes'].some(k=>typeof value[k]!=='string'))return null;return value}catch{return null}}
export function rememberContact(value:CustomerContact,enabled:boolean){try{if(enabled)localStorage.setItem(KEY,JSON.stringify(value));else localStorage.removeItem(KEY)}catch{}}
