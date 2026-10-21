import {createRootRouteWithContext,HeadContent,Outlet,Scripts,useLocation} from '@tanstack/react-router';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Toaster} from 'sonner';
import type {ReactNode} from 'react';
import {CartProvider} from '@/lib/cart';
import {SiteProvider} from '@/lib/site';
import {MotionEnhancer} from '@/components/Motion';
import {Header,Footer} from '@/components/StoreUI';
import appCss from '@/styles.css?url';
export const Route=createRootRouteWithContext<{queryClient:QueryClient}>()({head:()=>({meta:[{charSet:'utf-8'},{name:'viewport',content:'width=device-width, initial-scale=1'},{title:'هومي | أدوات منزلية وراحة'},{name:'referrer',content:'no-referrer'},{name:'description',content:'هومي — تفاصيل عملية وهادئة لبيت أكثر راحة وتنظيمًا.'}],links:[{rel:'stylesheet',href:appCss},{rel:'manifest',href:'/manifest.webmanifest'},{rel:'apple-touch-icon',href:'/icon-180.png'},{rel:'icon',type:'image/svg+xml',href:'/favicon.svg'},{rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap'}]}),shellComponent:Shell,component:Root,notFoundComponent:()=> <div className="wrap empty"><h1>الصفحة غير موجودة</h1><a href="/" className="btn">العودة للرئيسية</a></div>,errorComponent:({error,reset})=><div className="wrap empty"><h1>تعذر عرض الصفحة</h1><p>{error instanceof Error?error.message:'حدث خطأ غير متوقع'}</p><button className="btn" onClick={reset}>حاول مرة أخرى</button></div>});
function Shell({children}:{children:ReactNode}){return <html lang="ar" dir="rtl"><head><HeadContent/></head><body>{children}<Scripts/></body></html>}
function Root(){const {queryClient}=Route.useRouteContext();const loc=useLocation();return <QueryClientProvider client={queryClient}><SiteProvider><CartProvider><MotionEnhancer/><Toaster position="top-center" richColors/>{loc.pathname.startsWith('/admin')?<Outlet/>:<><Header/><main className="store-main"><Outlet/></main><Footer/></>}</CartProvider></SiteProvider></QueryClientProvider>}
