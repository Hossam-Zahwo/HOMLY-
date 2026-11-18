import {useEffect,useState} from 'react';
import {marketingConsent,setMarketingConsent} from '@/lib/marketing-tracking';

/** Non-essential analytics remain disabled until the visitor chooses. */
export function MarketingConsentBanner(){
 const [choice,setChoice]=useState<'granted'|'denied'|'unset'>('unset');
 useEffect(()=>{setChoice(marketingConsent());},[]);
 if(import.meta.env.VITE_MARKETING_TRACKING_ENABLED!=='true'||choice!=='unset')return null;
 const decide=(allowed:boolean)=>{setMarketingConsent(allowed);setChoice(allowed?'granted':'denied');};
 return <aside role="region" aria-label="اختيارات الخصوصية" dir="rtl" style={{position:'fixed',bottom:12,left:12,right:12,zIndex:9999,background:'#fff',color:'#26372a',border:'1px solid #d7e2d8',borderRadius:14,padding:16,boxShadow:'0 5px 25px #0002',maxWidth:600,margin:'auto'}}>
  <p style={{margin:'0 0 12px'}}>بنستخدم أدوات تحليل اختيارية لتحسين تجربة التسوق وقياس الإعلانات. تقدر توافق أو ترفض، والطلب هيشتغل عادي في الحالتين.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <button type="button" className="btn" onClick={()=>decide(true)}>موافق على التحليلات</button>
   <button type="button" className="btn outline" onClick={()=>decide(false)}>رفض التحليلات</button>
  </div>
 </aside>;
}
