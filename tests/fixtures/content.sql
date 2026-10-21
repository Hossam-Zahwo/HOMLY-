-- Run after 01_SETUP.sql. Additive, rerunnable upgrade; no existing orders/products deleted.
begin;
alter table public.homly_categories add column if not exists image_path text;
alter table public.homly_categories add column if not exists sort_order integer not null default 0;
alter table public.homly_categories add column if not exists is_active boolean not null default true;
create table if not exists public.homly_site_content(id text primary key check(id='main'),config jsonb not null,version integer not null default 0,updated_at timestamptz not null default now());
create table if not exists public.homly_site_drafts(like public.homly_site_content including all);
create table if not exists public.homly_order_item_checks(order_item_id uuid primary key references public.homly_order_items(id),order_id uuid not null references public.homly_orders(id),is_available boolean not null,checked_by uuid references auth.users(id),checked_at timestamptz not null default now());
create table if not exists public.homly_review_invites(order_id uuid primary key references public.homly_orders(id),token_hash text not null unique,expires_at timestamptz not null,used_at timestamptz);
create table if not exists public.homly_reviews(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.homly_orders(id),order_item_id uuid references public.homly_order_items(id),product_id uuid references public.homly_products(id),target text not null check(target in('site','product')),target_key text not null,display_name text not null check(length(display_name) between 2 and 60),rating integer not null check(rating between 1 and 5),comment text not null default '' check(length(comment)<=2000),status text not null default 'pending' check(status in('pending','approved','rejected')),created_at timestamptz not null default now(),moderated_by uuid references auth.users(id),moderated_at timestamptz,unique(order_id,target_key));
create table if not exists public.homly_review_uploads(storage_path text primary key,order_id uuid not null references public.homly_orders(id),token_hash text not null,mime text not null,bytes integer not null,created_at timestamptz not null default now());
create table if not exists public.homly_review_photos(id uuid primary key default gen_random_uuid(),review_id uuid not null references public.homly_reviews(id),storage_path text not null unique references public.homly_review_uploads(storage_path),sort_order integer not null);
create table if not exists public.homly_admin_notifications(id uuid primary key default gen_random_uuid(),kind text not null,title text not null,body text not null,url text not null,created_at timestamptz not null default now());
create table if not exists public.homly_admin_notification_reads(notification_id uuid references public.homly_admin_notifications(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,read_at timestamptz not null default now(),primary key(notification_id,user_id));
create table if not exists public.homly_push_subscriptions(endpoint text primary key,user_id uuid not null references auth.users(id) on delete cascade,subscription jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.homly_push_deliveries(notification_id uuid references public.homly_admin_notifications(id),endpoint text not null,status text not null default 'processing',updated_at timestamptz not null default now(),primary key(notification_id,endpoint));
create index if not exists homly_reviews_status_idx on public.homly_reviews(status,product_id,created_at desc);
create index if not exists homly_notifications_time_idx on public.homly_admin_notifications(created_at desc);
create index if not exists homly_checks_order_idx on public.homly_order_item_checks(order_id);
do $$declare t text;begin foreach t in array array['homly_site_content','homly_site_drafts','homly_order_item_checks','homly_review_invites','homly_reviews','homly_review_uploads','homly_review_photos','homly_admin_notifications','homly_admin_notification_reads','homly_push_subscriptions','homly_push_deliveries'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;end $$;
grant select on public.homly_site_content to anon,authenticated;
drop policy if exists homly_content_read on public.homly_site_content;
create policy homly_content_read on public.homly_site_content for select to anon,authenticated using(true);
do $$declare t text;begin foreach t in array array['homly_site_drafts','homly_order_item_checks','homly_reviews','homly_review_photos','homly_admin_notifications'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('drop policy if exists homly_admin_read on public.%I',t);
 execute format('create policy homly_admin_read on public.%I for select to authenticated using(public.homly_is_admin())',t);
 end loop;end $$;

create or replace function public.homly_save_site_content(p_config jsonb,p_publish boolean,p_expected_version integer) returns integer language plpgsql security definer set search_path='' as $$
declare v integer;b jsonb;
begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 if p_config is null or jsonb_typeof(p_config)<>'object' or octet_length(p_config::text)>524288 or p_config->>'schemaVersion'<>'2' then raise exception 'Invalid content document';end if;
 if jsonb_typeof(p_config->'blocks') is distinct from 'array' or jsonb_array_length(p_config->'blocks')>40 then raise exception 'Invalid sections';end if;
 for b in select value from jsonb_array_elements(p_config->'blocks') loop
  if b->>'type' is null or b->>'type' not in('hero','categories','products','editorial','budget','reviews','features','text') or jsonb_typeof(b->'slides') is distinct from 'array' or jsonb_array_length(b->'slides')>12 then raise exception 'Invalid block';end if;
 end loop;
 if jsonb_typeof(p_config->'header'->'links') is distinct from 'array' or jsonb_typeof(p_config->'footer'->'columns') is distinct from 'array' or jsonb_typeof(p_config->'pages') is distinct from 'array' then raise exception 'Invalid navigation';end if;
 select version into v from public.homly_site_drafts where id='main' for update;
 if v is distinct from p_expected_version then raise exception 'Content changed in another session. Reload before saving';end if;
 v=v+1;
 update public.homly_site_drafts set config=p_config,version=v,updated_at=now() where id='main';
 if p_publish then insert into public.homly_site_content(id,config,version) values('main',p_config,v) on conflict(id) do update set config=excluded.config,version=excluded.version,updated_at=now();end if;
 return v;
end $$;
create or replace function public.homly_save_push_public_key(p_key text,p_expected_version integer) returns integer language plpgsql security definer set search_path='' as $$declare v integer;begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 if p_key is null or (p_key<>'' and p_key!~'^[A-Za-z0-9_-]{87}$') then raise exception 'Invalid VAPID public key';end if;
 select version into v from public.homly_site_drafts where id='main' for update;
 if v is distinct from p_expected_version then raise exception 'Content changed. Reload before saving';end if;
 v=v+1;
 update public.homly_site_drafts set config=jsonb_set(config,'{pushPublicKey}',to_jsonb(p_key)),version=v,updated_at=now() where id='main';
 update public.homly_site_content set config=jsonb_set(config,'{pushPublicKey}',to_jsonb(p_key)),version=v,updated_at=now() where id='main';
 return v;end $$;
create or replace function public.homly_check_order_item(p_order_id uuid,p_item_id uuid,p_available boolean) returns void language plpgsql security definer set search_path='' as $$
declare s text;
begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 select fulfillment_status into s from public.homly_orders where id=p_order_id for update;
 if s is null or s not in('new','confirmed','preparing') then raise exception 'Order cannot be checked in this status';end if;
 if not exists(select 1 from public.homly_order_items where id=p_item_id and order_id=p_order_id) then raise exception 'Item does not belong to order';end if;
 insert into public.homly_order_item_checks values(p_item_id,p_order_id,p_available,auth.uid(),now()) on conflict(order_item_id) do update set is_available=excluded.is_available,checked_by=excluded.checked_by,checked_at=now();
end $$;
-- Enforce availability at the database boundary, including direct admin status RPC calls.
create or replace function public.homly_order_confirmation_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.fulfillment_status in('confirmed','shipped') and old.fulfillment_status is distinct from new.fulfillment_status and exists(select 1 from public.homly_order_items i where i.order_id=new.id and not exists(select 1 from public.homly_order_item_checks c where c.order_item_id=i.id and c.order_id=new.id and c.is_available)) then raise exception 'Review availability of every item before confirming or shipping';end if;
 return new;end $$;
drop trigger if exists homly_order_confirmation_guard on public.homly_orders;
create trigger homly_order_confirmation_guard before update of fulfillment_status on public.homly_orders for each row execute function public.homly_order_confirmation_guard();
create or replace function public.homly_save_shipping_zone(p_zone jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare zid uuid=coalesce(nullif(p_zone->>'id','')::uuid,gen_random_uuid());a text[];begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 if length(trim(coalesce(p_zone->>'governorate',''))) not between 2 and 100 or (p_zone->>'fee_minor')::bigint not between 0 and 100000000 or jsonb_typeof(p_zone->'areas') is distinct from 'array' or jsonb_array_length(p_zone->'areas')>200 then raise exception 'Invalid shipping zone';end if;
 select coalesce(array_agg(trim(value)),array[]::text[]) into a from jsonb_array_elements_text(p_zone->'areas');
 insert into public.homly_shipping_zones(id,governorate,areas,fee_minor,is_active) values(zid,trim(p_zone->>'governorate'),a,(p_zone->>'fee_minor')::bigint,coalesce((p_zone->>'is_active')::boolean,true)) on conflict(id) do update set governorate=excluded.governorate,areas=excluded.areas,fee_minor=excluded.fee_minor,is_active=excluded.is_active;
 return zid;end $$;
create or replace function public.homly_reorder_categories(p_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 perform 1 from public.homly_categories order by id for update;
 if cardinality(p_ids)<>(select count(*) from public.homly_categories) or cardinality(p_ids)<>(select count(distinct x) from unnest(p_ids) x) or exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.homly_categories where id=x)) then raise exception 'Reload category list before reordering';end if;
 update public.homly_categories c set sort_order=t.n-1 from unnest(p_ids) with ordinality t(id,n) where c.id=t.id;
end $$;

create or replace function public.homly_create_review_invite(p_order_id uuid,p_token text) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 perform 1 from public.homly_orders where id=p_order_id and fulfillment_status='delivered' for update;
 if not found then raise exception 'Reviews require a delivered order';end if;
 if p_token is null or p_token!~'^[a-f0-9]{64}$' then raise exception 'Invalid token';end if;
 if exists(select 1 from public.homly_reviews where order_id=p_order_id) then raise exception 'This order already submitted reviews';end if;
 insert into public.homly_review_invites values(p_order_id,encode(sha256(convert_to(p_token,'UTF8')),'hex'),now()+interval '30 days',null) on conflict(order_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=null;
end $$;
create or replace function public.homly_review_invite_info(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$declare inv public.homly_review_invites%rowtype;o public.homly_orders%rowtype;begin
 select * into inv from public.homly_review_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and expires_at>now();
 if not found then raise exception 'Invalid or expired review link';end if;
 select * into o from public.homly_orders where id=inv.order_id and fulfillment_status='delivered';if not found then raise exception 'Order must be delivered';end if;
 return jsonb_build_object('code',o.code,'submitted',inv.used_at is not null,'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'product_id',i.product_id,'title_snapshot',i.title_snapshot,'image_snapshot',i.image_snapshot) order by i.id) from public.homly_order_items i where i.order_id=o.id),'[]'::jsonb));end $$;
create or replace function public.homly_prepare_review_upload(p_token text,p_mime text,p_size integer) returns text language plpgsql security definer set search_path='' as $$declare inv public.homly_review_invites%rowtype;path text;begin
 select * into inv from public.homly_review_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and expires_at>now() and used_at is null for update;
 if not found or not exists(select 1 from public.homly_orders where id=inv.order_id and fulfillment_status='delivered') then raise exception 'Invalid review link';end if;
 if p_size is null or p_size not between 1 and 5242880 or p_mime is null or p_mime not in('image/jpeg','image/png','image/webp') then raise exception 'Invalid photo';end if;
 if (select count(*) from public.homly_review_uploads where token_hash=inv.token_hash)>=12 then raise exception 'Maximum 12 uploads per review invitation';end if;
 path=inv.order_id::text||'/'||gen_random_uuid()::text||case p_mime when 'image/png' then '.png' when 'image/webp' then '.webp' else '.jpg' end;
 insert into public.homly_review_uploads(storage_path,order_id,token_hash,mime,bytes) values(path,inv.order_id,inv.token_hash,p_mime,p_size);return path;end $$;
create or replace function public.homly_submit_reviews(p_token text,p_display_name text,p_reviews jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare inv public.homly_review_invites%rowtype;r jsonb;item public.homly_order_items%rowtype;rid uuid;k text;path text;n integer;begin
 select * into inv from public.homly_review_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and expires_at>now() for update;
 if not found or not exists(select 1 from public.homly_orders where id=inv.order_id and fulfillment_status='delivered') then raise exception 'Invalid or expired review link';end if;
 if inv.used_at is not null then return jsonb_build_object('submitted',true);end if;
 if length(trim(coalesce(p_display_name,''))) not between 2 and 60 or jsonb_typeof(p_reviews) is distinct from 'array' or jsonb_array_length(p_reviews)<1 or jsonb_array_length(p_reviews)>(select count(*)+1 from public.homly_order_items where order_id=inv.order_id) then raise exception 'Invalid reviews';end if;
 for r in select value from jsonb_array_elements(p_reviews) loop
  item=null;
  if nullif(r->>'order_item_id','') is not null then select * into item from public.homly_order_items where id=(r->>'order_item_id')::uuid and order_id=inv.order_id;if not found then raise exception 'Item not in this order';end if;end if;
  k=coalesce(item.id::text,'site');
  if jsonb_typeof(r->'photo_paths') is distinct from 'array' or jsonb_array_length(r->'photo_paths')>3 or r->>'rating' is null then raise exception 'Invalid rating or photos';end if;
  insert into public.homly_reviews(order_id,order_item_id,product_id,target,target_key,display_name,rating,comment) values(inv.order_id,item.id,item.product_id,case when item.id is null then 'site' else 'product' end,k,trim(p_display_name),(r->>'rating')::integer,coalesce(r->>'comment','')) returning id into rid;
  n=0;
  for path in select value from jsonb_array_elements_text(r->'photo_paths') loop
   if not exists(select 1 from public.homly_review_uploads u join storage.objects o on o.name=u.storage_path and o.bucket_id='homly-review-images' where u.storage_path=path and u.order_id=inv.order_id and u.token_hash=inv.token_hash) then raise exception 'Photo does not belong to this invitation or upload incomplete';end if;
   insert into public.homly_review_photos(review_id,storage_path,sort_order) values(rid,path,n);n=n+1;
  end loop;
 end loop;
 update public.homly_review_invites set used_at=now() where order_id=inv.order_id;return jsonb_build_object('submitted',true);
end $$;
create or replace function public.homly_moderate_review(p_review_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 if p_status is null or p_status not in('pending','approved','rejected') then raise exception 'Invalid moderation status';end if;
 update public.homly_reviews set status=p_status,moderated_by=auth.uid(),moderated_at=now() where id=p_review_id;if not found then raise exception 'Review not found';end if;end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('homly-review-images','homly-review-images',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists homly_review_images_admin on storage.objects;
create policy homly_review_images_admin on storage.objects for select to authenticated using(bucket_id='homly-review-images' and public.homly_is_admin());

create or replace function public.homly_notify_admin() returns trigger language plpgsql security definer set search_path='' as $$begin
 if TG_TABLE_NAME='homly_orders' then insert into public.homly_admin_notifications(kind,title,body,url) values('order','طلب جديد','وصل طلب جديد يحتاج المراجعة','/admin/orders?order='||new.id::text);
 else insert into public.homly_admin_notifications(kind,title,body,url) values('review','تقييم جديد بانتظار المراجعة','وصل تقييم جديد يحتاج الموافقة','/admin/reviews');end if;return new;end $$;
drop trigger if exists homly_new_order_notice on public.homly_orders;
create trigger homly_new_order_notice after insert on public.homly_orders for each row execute function public.homly_notify_admin();
drop trigger if exists homly_new_review_notice on public.homly_reviews;
create trigger homly_new_review_notice after insert on public.homly_reviews for each row execute function public.homly_notify_admin();
create or replace function public.homly_admin_inbox() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 return jsonb_build_object('unread_count',(select count(*) from public.homly_admin_notifications n where not exists(select 1 from public.homly_admin_notification_reads r where r.notification_id=n.id and r.user_id=auth.uid())),'items',coalesce((select jsonb_agg(x order by x.created_at desc) from(select n.*,exists(select 1 from public.homly_admin_notification_reads r where r.notification_id=n.id and r.user_id=auth.uid()) is_read from public.homly_admin_notifications n order by n.created_at desc limit 100)x),'[]'::jsonb));end $$;
create or replace function public.homly_mark_notifications_read(p_id uuid default null) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 insert into public.homly_admin_notification_reads(notification_id,user_id) select id,auth.uid() from public.homly_admin_notifications where p_id is null or id=p_id on conflict do nothing;end $$;
create or replace function public.homly_save_push_subscription(p_subscription jsonb) returns void language plpgsql security definer set search_path='' as $$declare ep text=p_subscription->>'endpoint';begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 if ep is null or length(ep)>2048 or ep!~'^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' or coalesce(length(p_subscription->'keys'->>'p256dh'),0) not between 30 and 200 or coalesce(length(p_subscription->'keys'->>'auth'),0) not between 10 and 100 then raise exception 'Unsupported push subscription';end if;
 if (select count(*) from public.homly_push_subscriptions where user_id=auth.uid())>=10 and not exists(select 1 from public.homly_push_subscriptions where endpoint=ep) then raise exception 'Maximum 10 devices';end if;
 insert into public.homly_push_subscriptions(endpoint,user_id,subscription) values(ep,auth.uid(),p_subscription) on conflict(endpoint) do update set user_id=excluded.user_id,subscription=excluded.subscription,updated_at=now();end $$;
create or replace function public.homly_remove_push_subscription(p_endpoint text) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 delete from public.homly_push_subscriptions where endpoint=p_endpoint and user_id=auth.uid();end $$;

-- Exact grants: guests can never invoke invite/submit/upload SQL directly.
do $$declare f record;begin for f in select p.oid::regprocedure sig,p.proname name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['homly_save_site_content','homly_save_push_public_key','homly_check_order_item','homly_save_shipping_zone','homly_reorder_categories','homly_create_review_invite','homly_review_invite_info','homly_prepare_review_upload','homly_submit_reviews','homly_moderate_review','homly_admin_inbox','homly_mark_notifications_read','homly_save_push_subscription','homly_remove_push_subscription','homly_notify_admin','homly_order_confirmation_guard']) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 if f.name in('homly_review_invite_info','homly_prepare_review_upload','homly_submit_reviews') then execute format('grant execute on function %s to service_role',f.sig);
 elsif f.name not in('homly_notify_admin','homly_order_confirmation_guard') then execute format('grant execute on function %s to authenticated',f.sig);end if;
 end loop;end $$;
-- Realtime is an optimization; polling remains available if publication cannot be edited.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='homly_admin_notifications') then alter publication supabase_realtime add table public.homly_admin_notifications;end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='homly_site_content') then alter publication supabase_realtime add table public.homly_site_content;end if;
 end if;end $$;

insert into public.homly_site_content(id,config) values('main',$homyjson${"schemaVersion":2,"brand":{"name":"هومي","latin":"H O M Y","logo":"","tagline":"تفاصيل عملية لبيت أكثر راحة"},"header":{"announcement":"","showSearch":true,"searchPlaceholder":"ابحث عن منتجات لبيتك...","showOrders":true,"showCategories":true,"links":[{"id":"all","label":"جميع المنتجات","href":"/products","visible":true},{"id":"offers","label":"العروض","href":"/offers","visible":true}]},"footer":{"description":"كل ركن أجمل مع هومي.\nاختيارات عملية لبيت أكثر راحة.","copyright":"هومي — جميع الحقوق محفوظة","columns":[{"id":"shop","title":"تسوق","links":[{"id":"products","label":"جميع المنتجات","href":"/products","visible":true},{"id":"categories","label":"أقسام المتجر","href":"/categories","visible":true},{"id":"offers","label":"العروض","href":"/offers","visible":true}]},{"id":"help","title":"معاك في كل خطوة","links":[{"id":"cart","label":"سلة التسوق","href":"/cart","visible":true},{"id":"orders","label":"طلباتي","href":"/orders","visible":true},{"id":"contact","label":"تواصل معنا","href":"/page/contact","visible":true}]}],"socials":[]},"whatsapp":{"enabled":false,"number":"","orderMessage":"أهلًا، عايز أؤكد الطلب رقم {code}.","reviewMessage":"شكرًا لاختيارك هومي. يسعدنا تقييمك لتجربتك والمنتجات اللي وصلتك: {link}","showFloating":true},"style":{"primary":"#687664","background":"#FCFCFA","text":"#373B38","radius":14,"spacing":34,"motion":true},"labels":{"catalogBannerImage":"/images/storage.png","catalogSubtitle":"حلول عملية ولمسات هادئة لكل زاوية في منزلك","offersTitle":"عروض هومي","allProducts":"جميع المنتجات","homeLabel":"الرئيسية","filterLabel":"فلترة","sortLabel":"ترتيب","filterTitle":"فلترة النتائج","maxPriceLabel":"أقصى سعر بالجنيه","availableLabel":"متوفر حاليًا","clearFilters":"مسح الفلاتر","showResults":"عرض النتائج","ordersTitle":"طلباتي","emptyProducts":"لا توجد منتجات منشورة في هذا القسم بعد.","continueShopping":"استكمل التسوق","categoriesSubtitle":"اكتشف أقسام المتجر","productAdd":"أضف للسلة","productBuy":"اشتري الآن","inStock":"متوفر في المخزون","outOfStock":"غير متوفر حاليًا","productDescription":"الوصف","productSpecs":"المواصفات","productChoices":"اختار المناسب ليك","related":"منتجات ممكن تعجبك","sameGroup":"من نفس المجموعة","cartTitle":"سلة التسوق","checkoutTitle":"بيانات التوصيل والدفع","checkoutConfirm":"تسجيل الطلب","orderThanks":"تم استلام طلبك","whatsappConfirm":"تأكيد ومتابعة الطلب على واتساب","codLabel":"الدفع عند الاستلام","searchTitle":"اختيارات لبيتك","categoriesTitle":"كل ركن في بيتك","reviewsTitle":"آراء عملائنا","reviewFormTitle":"شاركنا تجربتك","customerName":"الاسم بالكامل","customerPhone":"رقم الموبايل","customerArea":"المنطقة / الحي","customerAddress":"العنوان التفصيلي","customerNotes":"ملاحظات إضافية (اختياري)","shippingNote":"تكلفة الشحن تظهر بعد اختيار منطقة التوصيل.","emptyCart":"السلة لسه فاضية","trustShipping":"تفاصيل الشحن واضحة","trustQuality":"اختيارات لبيتك","trustOrders":"تابع طلبك بسهولة"},"pages":[{"id":"contact","slug":"contact","title":"تواصل معنا","body":"يسعدنا مساعدتك. استخدم زر واتساب للتواصل بعد تفعيله."}],"pushPublicKey":"","blocks":[{"id":"hero","type":"hero","title":"كل ركن له حكاية","subtitle":"مستلزمات وأفكار تجعل منزلك أكثر راحة وجمالًا","body":"","image":"/images/living.png","buttonLabel":"تسوق الآن","href":"/products","showButton":true,"visible":true,"source":"all","categoryId":"","variantIds":[],"limit":4,"maxPrice":500,"slides":[{"id":"kitchen","title":"المطبخ","subtitle":"أدوات تصنع فرقًا كل يوم","image":"/images/kitchen.png","mobileImage":"","alt":"المطبخ","buttonLabel":"تسوق الآن","href":"/category/kitchen","showButton":true,"visible":true},{"id":"living","title":"غرفة المعيشة","subtitle":"راحة تضيف لحياتك أجمل","image":"/images/living.png","mobileImage":"","alt":"غرفة المعيشة","buttonLabel":"تسوق الآن","href":"/category/comfort","showButton":true,"visible":true},{"id":"storage","title":"التنظيم والترتيب","subtitle":"كل شيء في مكانه","image":"/images/storage.png","mobileImage":"","alt":"التنظيم","buttonLabel":"تسوق الآن","href":"/category/storage","showButton":true,"visible":true}]},{"id":"rooms","type":"categories","title":"تسوق حسب الغرفة","subtitle":"","body":"","image":"/images/living.png","buttonLabel":"تسوق الآن","href":"/categories","showButton":true,"visible":true,"source":"all","categoryId":"","variantIds":[],"limit":4,"maxPrice":500,"slides":[]},{"id":"comfort","type":"editorial","title":"ركن الراحة","subtitle":"تفاصيل صغيرة.. تصنع فرق كبير في يومك","body":"","image":"/images/living.png","buttonLabel":"تسوق الآن","href":"/products","showButton":true,"visible":true,"source":"all","categoryId":"","variantIds":[],"limit":4,"maxPrice":500,"slides":[]},{"id":"budget","type":"budget","title":"لمسات بأقل من ٥٠٠ جنيه","subtitle":"اختيارات عملية تناسب بيتك","body":"","image":"/images/living.png","buttonLabel":"تسوق الآن","href":"/products","showButton":true,"visible":true,"source":"all","categoryId":"","variantIds":[],"limit":4,"maxPrice":500,"slides":[]},{"id":"new","type":"products","title":"وصل حديثًا","subtitle":"","body":"","image":"/images/living.png","buttonLabel":"تسوق الآن","href":"/products","showButton":true,"visible":true,"source":"latest","categoryId":"","variantIds":[],"limit":4,"maxPrice":500,"slides":[]},{"id":"fragrance","type":"text","title":"عطور ولمسات هادئة","subtitle":"أجواء أجمل في كل ركن من بيتك","body":"","image":"/images/diffuser.png","buttonLabel":"تسوق الآن","href":"/products","showButton":true,"visible":true,"source":"all","categoryId":"","variantIds":[],"limit":4,"maxPrice":500,"slides":[]},{"id":"reviews","type":"reviews","title":"آراء عملائنا","subtitle":"","body":"","image":"/images/living.png","buttonLabel":"تسوق الآن","href":"/products","showButton":true,"visible":true,"source":"all","categoryId":"","variantIds":[],"limit":4,"maxPrice":500,"slides":[]},{"id":"trust","type":"features","title":"معاك في كل خطوة","subtitle":"","body":"","image":"/images/living.png","buttonLabel":"تسوق الآن","href":"/products","showButton":true,"visible":true,"source":"all","categoryId":"","variantIds":[],"limit":4,"maxPrice":500,"slides":[]}]}$homyjson$::jsonb) on conflict(id) do nothing;
insert into public.homly_site_drafts select * from public.homly_site_content on conflict(id) do nothing;
commit;
