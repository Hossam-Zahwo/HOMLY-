# إصلاح Sitemap لموقع HOMEY – 25 أكتوبر 2026

تمت إضافة مسارين Server Routes في TanStack Start:
- `src/routes/sitemap[.]xml.ts` → `https://www.homeyegypt.com/sitemap.xml`
- `src/routes/robots[.]txt.ts` → `https://www.homeyegypt.com/robots.txt`

يتصل المسار الأول بمخزون Supabase العام ويعرض روابط الصفحة الرئيسية والكتالوج والأقسام النشطة وتفريعات المنتجات المنشورة فقط، تلقائيًا مع تغيّر المنتجات. يتطلب وجود متغيرات Supabase الصحيحة التي يستخدمها الموقع بالفعل على السيرفر في إعدادات Vercel.

طريقة التركيب:
1. استبدل مجلد `src` الموجود في مشروعك بمجلد `src` من ملف ZIP، ولا تغير باقي ملفات المشروع.
2. تأكد أن Vercel يُنشئ Server Routes أثناء البناء (TanStack Start) وأن أي rewrite في `vercel.json` لا يعيد `sitemap.xml` إلى `index.html`.
3. نفّذ Deploy جديد.
4. افتح `/sitemap.xml`، وتأكد أن المحتوى يبدأ بـ `<?xml` وينتهي بـ `</urlset>`، وفيه روابط `/product/` وأن Content-Type هو application/xml وأن الحالة HTTP 200.
5. افتح `/robots.txt` وتأكد من وجود رابط Sitemap.
6. في Google Search Console > Sitemaps أعد إرسال `sitemap.xml`، ثم افحص رابط الصفحة الرئيسية واطلب الفهرسة عند اللزوم.

ملحوظات مهمة:
- التعديل لا يحتاج SQL، ويحافظ على تعديلات السلايدر والمخزون والكروت والـSEO السابقة.
- السورس الذي لدينا مجلد `src` فقط، لذا لم يتم اختبار بناء Vercel كاملًا أو الوصول لقيم Supabase الحقيقية.
- إذا استمر ظهور HTML فافحص إعدادات `vercel.json` أو ملفات `public/sitemap.xml` القديمة؛ قد تمنع المسار الجديد من العمل.
- لو رجع 503 بدل XML فهذا معناه أن إعدادات Supabase أو قراءة الجداول تحتاج مراجعة؛ لا تُعيد إرسال الخريطة قبل ظهور 200/XML.
- إضافة Sitemap لا تضمن الفهرسة أو ترتيب البحث، لكنها تصحح خطأ ملف الخريطة.
