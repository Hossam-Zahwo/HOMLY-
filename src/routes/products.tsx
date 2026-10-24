import {createFileRoute} from '@tanstack/react-router';
import {CatalogPage,parseShop} from '@/components/CatalogPage';
export const Route=createFileRoute('/products')({head:()=>({meta:[{title:'تسوق جميع الأدوات المنزلية | هومي مصر'},{name:'description',content:'اكتشف أدوات المطبخ والتنظيم والتخزين والديكور ومستلزمات البيت من هومي مصر.'}]}),validateSearch:parseShop,component:()=> <CatalogPage search={Route.useSearch()}/>});
