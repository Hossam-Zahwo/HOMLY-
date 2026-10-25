import {createFileRoute} from '@tanstack/react-router';
import {HomeContent} from '@/components/HomeContent';
import {HOMEY_ORIGIN,homeDescription,homeKeywords,safeStructuredData} from '@/lib/seo';

export const Route=createFileRoute('/')({
  head:()=>({
    meta:[
      {title:'هومي مصر | أدوات منزلية ورفايع وتنظيم المطبخ والبيت'},
      {name:'description',content:homeDescription},
      {name:'keywords',content:homeKeywords},
      {property:'og:type',content:'website'},
      {property:'og:title',content:'هومي مصر | أدوات منزلية ومستلزمات البيت'},
      {property:'og:description',content:homeDescription},
      {property:'og:url',content:HOMEY_ORIGIN+'/'},
      {name:'twitter:title',content:'هومي مصر | أدوات منزلية وتنظيم البيت'},
      {name:'twitter:description',content:homeDescription}
    ],
    links:[{rel:'canonical',href:HOMEY_ORIGIN+'/'}],
    scripts:[{
      type:'application/ld+json',
      children:safeStructuredData({
        '@context':'https://schema.org',
        '@graph':[
          {'@type':'Organization','@id':HOMEY_ORIGIN+'/#organization',name:'هومي مصر',alternateName:'HOMEY Egypt',url:HOMEY_ORIGIN},
          {'@type':'WebSite','@id':HOMEY_ORIGIN+'/#website',name:'هومي مصر | HOMEY Egypt',url:HOMEY_ORIGIN,inLanguage:'ar-EG',publisher:{'@id':HOMEY_ORIGIN+'/#organization'}}
        ]
      })
    }]
  }),
  component:HomeContent
});
