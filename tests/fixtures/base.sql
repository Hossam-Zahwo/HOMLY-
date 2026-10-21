-- HOMY Supabase setup. Non-destructive to unrelated tables. Run in SQL Editor as project owner.
-- Existing compatible homly_* foundation tables are retained. No DROP TABLE, TRUNCATE or auth-user deletion.
begin;
create table if not exists public.homly_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homly_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.homly_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.homly_categories(id) on delete set null,
  name_ar text not null,
  slug text not null unique,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homly_products (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  kind text not null default 'simple' check(kind in ('simple','variable')),
  display_mode text not null default 'grouped' check(display_mode in ('grouped','separate_variants')),
  status text not null default 'draft' check(status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homly_product_categories (
  product_id uuid not null references public.homly_products(id) on delete cascade,
  category_id uuid not null references public.homly_categories(id) on delete restrict,
  primary key(product_id, category_id)
);

create table if not exists public.homly_product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.homly_products(id) on delete cascade,
  name_ar text not null,
  position integer not null default 0,
  unique(product_id, name_ar),
  unique(id, product_id)
);

create table if not exists public.homly_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.homly_product_options(id) on delete cascade,
  label_ar text not null,
  swatch_hex text check(swatch_hex is null or swatch_hex ~ '^#[0-9A-Fa-f]{6}$'),
  thumbnail_path text,
  position integer not null default 0,
  unique(option_id, label_ar),
  unique(id, option_id)
);

create table if not exists public.homly_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.homly_products(id) on delete restrict,
  sku text not null unique,
  slug text not null unique,
  title_override text,
  description_override text,
  price_minor bigint not null check(price_minor >= 0),
  compare_at_minor bigint check(compare_at_minor is null or compare_at_minor >= price_minor),
  stock_on_hand integer not null default 0 check(stock_on_hand >= 0),
  stock_reserved integer not null default 0 check(stock_reserved >= 0 and stock_reserved <= stock_on_hand),
  status text not null default 'draft' check(status in ('draft','published','archived')),
  is_listed boolean not null default true,
  combination_key text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, combination_key),
  unique(id, product_id)
);

create table if not exists public.homly_variant_option_values (
  variant_id uuid not null,
  product_id uuid not null,
  option_id uuid not null,
  value_id uuid not null,
  primary key(variant_id, option_id),
  foreign key(variant_id, product_id) references public.homly_product_variants(id, product_id) on delete cascade,
  foreign key(option_id, product_id) references public.homly_product_options(id, product_id) on delete cascade,
  foreign key(value_id, option_id) references public.homly_option_values(id, option_id) on delete restrict
);

create table if not exists public.homly_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.homly_products(id) on delete cascade,
  variant_id uuid,
  storage_path text not null,
  alt_ar text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key(variant_id, product_id) references public.homly_product_variants(id, product_id) on delete cascade
);

create table if not exists public.homly_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.homly_product_variants(id) on delete restrict,
  delta_on_hand integer not null default 0,
  delta_reserved integer not null default 0,
  reason text not null,
  order_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.homly_shipping_zones (
  id uuid primary key default gen_random_uuid(),
  governorate text not null,
  areas text[] not null default '{}',
  fee_minor bigint not null check(fee_minor >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(governorate, areas)
);

create table if not exists public.homly_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check(discount_type in ('fixed','percent')),
  discount_value bigint not null check(discount_value > 0),
  minimum_subtotal_minor bigint not null default 0 check(minimum_subtotal_minor >= 0),
  max_discount_minor bigint check(max_discount_minor is null or max_discount_minor >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check(usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check(usage_count >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.homly_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('HOM-' || upper(replace(gen_random_uuid()::text,'-',''))),
  user_id uuid references auth.users(id) on delete set null,
  guest_access_hash text,
  customer_name text not null,
  customer_phone text not null,
  governorate text not null,
  area text not null,
  address text not null,
  customer_notes text,
  fulfillment_status text not null default 'new' check(fulfillment_status in ('new','confirmed','preparing','shipped','delivered','cancelled','return_requested','returned','delivery_failed')),
  payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','failed','partially_refunded','refunded')),
  payment_method text not null default 'cod' check(payment_method in ('cod','online')),
  subtotal_minor bigint not null check(subtotal_minor >= 0),
  discount_minor bigint not null default 0 check(discount_minor >= 0),
  shipping_minor bigint not null check(shipping_minor >= 0),
  tax_minor bigint not null default 0 check(tax_minor >= 0),
  total_minor bigint not null check(total_minor >= 0),
  currency text not null default 'EGP' check(currency = 'EGP'),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homly_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.homly_orders(id) on delete restrict,
  variant_id uuid references public.homly_product_variants(id) on delete set null,
  product_id uuid references public.homly_products(id) on delete set null,
  sku_snapshot text not null,
  title_snapshot text not null,
  options_snapshot jsonb not null default '{}'::jsonb,
  image_snapshot text,
  unit_price_minor bigint not null check(unit_price_minor >= 0),
  quantity integer not null check(quantity > 0),
  line_total_minor bigint not null check(line_total_minor >= 0)
);

create table if not exists public.homly_order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.homly_orders(id) on delete restrict,
  old_status text,
  new_status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.homly_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.homly_orders(id) on delete restrict,
  variant_id uuid not null references public.homly_product_variants(id) on delete restrict,
  quantity integer not null check(quantity > 0),
  status text not null default 'active' check(status in ('active','consumed','released')),
  expires_at timestamptz,
  unique(order_id, variant_id)
);

create table if not exists public.homly_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.homly_orders(id) on delete restrict,
  provider text not null,
  provider_reference text unique,
  amount_minor bigint not null check(amount_minor >= 0),
  status text not null default 'pending' check(status in ('pending','paid','failed','refunded')),
  webhook_event_reference text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.homly_store_settings (
  key text primary key,
  public_value jsonb,
  private_value jsonb,
  updated_at timestamptz not null default now()
);

-- Internal bookkeeping; never readable by public clients.
create table if not exists public.homly_order_requests (
 idempotency_key text primary key,
 order_id uuid not null references public.homly_orders(id),
 request_hash text not null,
 user_id uuid references auth.users(id)
);
create table if not exists public.homly_checkout_limits (
 rate_key text not null,
 window_start timestamptz not null,
 attempts integer not null check(attempts>0),
 primary key(rate_key,window_start)
);
create unique index if not exists homly_one_order_movement on public.homly_inventory_movements(order_id,variant_id,reason) where order_id is not null;
create index if not exists homly_variant_parent_idx on public.homly_product_variants(product_id,status);
create index if not exists homly_images_parent_idx on public.homly_product_images(product_id,variant_id,sort_order);
create index if not exists homly_orders_user_idx on public.homly_orders(user_id,created_at desc);
create index if not exists homly_order_items_parent_idx on public.homly_order_items(order_id);
create index if not exists homly_order_history_parent_idx on public.homly_order_status_history(order_id);

create or replace function public.homly_is_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.homly_user_roles where user_id=auth.uid() and role='admin')
$$;
revoke all on function public.homly_is_admin() from public,anon,authenticated;
grant execute on function public.homly_is_admin() to anon,authenticated,service_role;

create or replace function public.homly_set_updated_at()
returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end $$;
do $$ declare t text; begin
 foreach t in array array['homly_profiles','homly_categories','homly_products','homly_product_variants','homly_orders','homly_store_settings'] loop
  execute format('drop trigger if exists %I on public.%I',t||'_set_updated_at',t);
  execute format('create trigger %I before update on public.%I for each row execute function public.homly_set_updated_at()',t||'_set_updated_at',t);
 end loop;
end $$;

-- SECURE helpers for policies, so policies never recurse through related tables.
create or replace function public.homly_product_visible(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.homly_products p where p.id=p_id and p.status='published')
$$;
create or replace function public.homly_variant_visible(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.homly_product_variants v join public.homly_products p on p.id=v.product_id
 where v.id=p_id and v.status='published' and p.status='published')
$$;
create or replace function public.homly_order_owned(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.homly_orders o where o.id=p_id and o.user_id=auth.uid())
$$;
revoke all on function public.homly_product_visible(uuid),public.homly_variant_visible(uuid),public.homly_order_owned(uuid) from public,anon,authenticated;
grant execute on function public.homly_product_visible(uuid),public.homly_variant_visible(uuid) to anon,authenticated;
grant execute on function public.homly_order_owned(uuid) to authenticated;

-- Replace policies ONLY on tables owned by this module. Unrelated tables are untouched.
do $$ declare t text;r record; begin
 foreach t in array array['homly_profiles','homly_user_roles','homly_categories','homly_products','homly_product_categories',
 'homly_product_options','homly_option_values','homly_product_variants','homly_variant_option_values','homly_product_images',
 'homly_inventory_movements','homly_shipping_zones','homly_coupons','homly_orders','homly_order_items','homly_order_status_history',
 'homly_stock_reservations','homly_payment_attempts','homly_store_settings','homly_order_requests','homly_checkout_limits'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  for r in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy %I on public.%I',r.policyname,t);
  end loop;
 end loop;
end $$;

grant select on public.homly_categories,public.homly_products,public.homly_product_categories,public.homly_product_options,
 public.homly_option_values,public.homly_product_variants,public.homly_variant_option_values,public.homly_product_images,
 public.homly_shipping_zones to anon,authenticated;
grant insert,update,delete on public.homly_categories to authenticated;
grant select on public.homly_orders,public.homly_order_items,public.homly_order_status_history,public.homly_user_roles to authenticated;
create policy homly_categories_read on public.homly_categories for select to anon,authenticated using(is_active or public.homly_is_admin());
create policy homly_categories_write on public.homly_categories for all to authenticated using(public.homly_is_admin()) with check(public.homly_is_admin());
create policy homly_products_read on public.homly_products for select to anon,authenticated using(status='published' or public.homly_is_admin());
create policy homly_variants_read on public.homly_product_variants for select to anon,authenticated using(public.homly_is_admin() or (status='published' and public.homly_product_visible(product_id)));
create policy homly_categories_links_read on public.homly_product_categories for select to anon,authenticated using(public.homly_is_admin() or public.homly_product_visible(product_id));
create policy homly_options_read on public.homly_product_options for select to anon,authenticated using(public.homly_is_admin() or public.homly_product_visible(product_id));
create policy homly_values_read on public.homly_option_values for select to anon,authenticated using(public.homly_is_admin() or exists(select 1 from public.homly_product_options o where o.id=option_id and public.homly_product_visible(o.product_id)));
create policy homly_variant_values_read on public.homly_variant_option_values for select to anon,authenticated using(public.homly_is_admin() or public.homly_variant_visible(variant_id));
create policy homly_images_read on public.homly_product_images for select to anon,authenticated using(public.homly_is_admin() or (public.homly_product_visible(product_id) and (variant_id is null or public.homly_variant_visible(variant_id))));
create policy homly_shipping_read on public.homly_shipping_zones for select to anon,authenticated using(is_active or public.homly_is_admin());
create policy homly_orders_read on public.homly_orders for select to authenticated using(public.homly_is_admin() or user_id=auth.uid());
create policy homly_items_read on public.homly_order_items for select to authenticated using(public.homly_is_admin() or public.homly_order_owned(order_id));
-- Notes in order_status_history are internal. Customers do not read this table.
create policy homly_history_admin_read on public.homly_order_status_history for select to authenticated using(public.homly_is_admin());
create policy homly_roles_admin_read on public.homly_user_roles for select to authenticated using(public.homly_is_admin());

-- Storage bucket and permissions for manager image uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('homly-products','homly-products',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists homly_images_storage_read on storage.objects;
drop policy if exists homly_images_storage_insert on storage.objects;
drop policy if exists homly_images_storage_update on storage.objects;
drop policy if exists homly_images_storage_delete on storage.objects;
create policy homly_images_storage_read on storage.objects for select to anon,authenticated using(bucket_id='homly-products');
create policy homly_images_storage_insert on storage.objects for insert to authenticated with check(bucket_id='homly-products' and public.homly_is_admin());
create policy homly_images_storage_update on storage.objects for update to authenticated using(bucket_id='homly-products' and public.homly_is_admin()) with check(bucket_id='homly-products' and public.homly_is_admin());
create policy homly_images_storage_delete on storage.objects for delete to authenticated using(bucket_id='homly-products' and public.homly_is_admin());

create or replace function public.homly_check_image(p_url text)
returns text language plpgsql security definer set search_path='' as $$
declare object_name text;begin
 if p_url ~ '^/images/[a-zA-Z0-9._-]+$' then return p_url;end if;
 if p_url ~ '^https://[^/]+/storage/v1/object/public/homly-products/' then
  object_name=split_part(split_part(p_url,'/storage/v1/object/public/homly-products/',2),'?',1);
  if exists(select 1 from storage.objects where bucket_id='homly-products' and name=object_name) then return p_url;end if;
 elsif exists(select 1 from storage.objects where bucket_id='homly-products' and name=p_url) then return p_url;
 end if;
 raise exception 'Invalid or missing image: %',left(p_url,100);
end $$;
revoke all on function public.homly_check_image(text) from public,anon,authenticated;

create or replace function public.homly_save_product(payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;vid uuid;cid uuid;oid uuid;val_id uuid;v jsonb;img jsonb;kv record;
 old_v public.homly_product_variants%rowtype;kind_v text;mode_v text;status_v text;vstatus text;
 opts jsonb;k text;expected_keys text[];current_keys text[];seen_ids uuid[]='{}';seen_keys text[]='{}';kept boolean;seq integer;price_v bigint;stock_v integer;
begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object' or length(payload::text)>200000 then raise exception 'Invalid product payload';end if;
 if length(trim(coalesce(payload->>'title_ar','')))<1 or length(payload->>'title_ar')>250 then raise exception 'Product title is required (max 250)';end if;
 kind_v=coalesce(payload->>'kind','simple');mode_v=coalesce(payload->>'display_mode','grouped');status_v=coalesce(payload->>'status','draft');
 if kind_v not in ('simple','variable') or mode_v not in ('grouped','separate_variants') or status_v not in ('draft','published','archived') then raise exception 'Invalid product state';end if;
 if jsonb_typeof(payload->'variants') is distinct from 'array' or jsonb_array_length(payload->'variants') not between 1 and 100 then raise exception 'Supply 1 to 100 variants';end if;
 if kind_v='simple' and jsonb_array_length(payload->'variants')<>1 then raise exception 'Simple product requires one variant';end if;
 if jsonb_typeof(payload->'categories') is distinct from 'array' or jsonb_array_length(payload->'categories')<1 then raise exception 'Choose a category';end if;
 if jsonb_typeof(coalesce(payload->'images','[]')) is distinct from 'array' or jsonb_array_length(coalesce(payload->'images','[]'))>20 then raise exception 'Invalid images';end if;
 if jsonb_typeof(coalesce(payload->'specifications','{}')) is distinct from 'object' or length(coalesce(payload->>'description',''))>20000 then raise exception 'Invalid description/specifications';end if;
 pid=nullif(payload->>'id','')::uuid;
 if pid is null then
  pid=gen_random_uuid();insert into public.homly_products(id,title_ar) values(pid,trim(payload->>'title_ar'));
 else
  perform 1 from public.homly_products where id=pid for update;
  if not found then raise exception 'Product not found';end if;
 end if;
 -- Lock children consistently. This serializes edits with stock reservations/dispatch.
 perform 1 from public.homly_product_variants where product_id=pid order by id for update;
 update public.homly_products set title_ar=trim(payload->>'title_ar'),description=payload->>'description',specifications=coalesce(payload->'specifications','{}'),kind=kind_v,display_mode=mode_v,status=status_v where id=pid;
 delete from public.homly_product_categories where product_id=pid;
 for cid in select distinct value::uuid from jsonb_array_elements_text(payload->'categories') loop
  if not exists(select 1 from public.homly_categories where id=cid) then raise exception 'Unknown category';end if;
  insert into public.homly_product_categories values(pid,cid);
 end loop;
 -- Options/values are upserted; existing identities are never needlessly regenerated.
 delete from public.homly_product_images where product_id=pid;
 seq=0;
 for img in select value from jsonb_array_elements(coalesce(payload->'images','[]')) loop
  insert into public.homly_product_images(product_id,storage_path,sort_order) values(pid,public.homly_check_image(img#>>'{}'),seq);seq=seq+1;
 end loop;
 for v in select value from jsonb_array_elements(payload->'variants') loop
  opts=coalesce(v->'options','{}');
  if jsonb_typeof(opts) is distinct from 'object' or (select count(*) from jsonb_object_keys(opts))>6 then raise exception 'Invalid variant options';end if;
  if kind_v='simple' and opts<>'{}'::jsonb then raise exception 'Simple products cannot have choices';end if;
  if kind_v='variable' and opts='{}'::jsonb then raise exception 'Variable product needs choices';end if;
  for kv in select key,value from jsonb_each_text(opts) loop
   if trim(kv.key)='' or trim(coalesce(kv.value,''))='' or length(kv.key)>80 or length(kv.value)>100 then raise exception 'Invalid option name/value';end if;
  end loop;
  if exists(select 1 from jsonb_each(opts) where jsonb_typeof(value)<>'string') then raise exception 'Option values must be text';end if;
  if kind_v='variable' and (v->>'status') is distinct from 'archived' then
   select array_agg(key order by key collate "C") into current_keys from jsonb_object_keys(opts) as x(key);
   if expected_keys is null then expected_keys=current_keys;elsif expected_keys<>current_keys then raise exception 'Active variants must use the same option names';end if;
  end if;
  k=case when kind_v='simple' then 'default' else opts::text end;
  if k=any(seen_keys) then raise exception 'Duplicate variant combination';end if;seen_keys=array_append(seen_keys,k);
  vid=nullif(v->>'id','')::uuid;kept=vid is not null;
  if kept then
   select * into old_v from public.homly_product_variants where id=vid and product_id=pid;
   if not found then raise exception 'Variant belongs to another product or is missing';end if;
  else vid=gen_random_uuid();old_v.stock_on_hand=0;old_v.stock_reserved=0;end if;
  if vid=any(seen_ids) then raise exception 'Repeated variant ID';end if;seen_ids=array_append(seen_ids,vid);
  price_v=(v->>'price_minor')::bigint;stock_v=(v->>'stock_on_hand')::integer;
  if price_v is null or price_v<=0 or stock_v is null or stock_v<coalesce(old_v.stock_reserved,0) then raise exception 'Invalid price/stock';end if;
  if length(trim(coalesce(v->>'sku','')))=0 or length(v->>'sku')>100 or coalesce(v->>'slug','') !~ '^[^/?#[:space:]]{1,200}$' then raise exception 'Valid SKU and slug required';end if;
  vstatus=case when v->>'status'='archived' then 'archived' else status_v end;
  insert into public.homly_product_variants(id,product_id,sku,slug,title_override,description_override,price_minor,compare_at_minor,stock_on_hand,stock_reserved,status,is_listed,combination_key,sort_order)
  values(vid,pid,trim(v->>'sku'),v->>'slug',nullif(v->>'title_override',''),nullif(v->>'description_override',''),price_v,nullif(v->>'compare_at_minor','')::bigint,stock_v,coalesce(old_v.stock_reserved,0),vstatus,coalesce((v->>'is_listed')::boolean,true),k,coalesce((v->>'sort_order')::integer,0))
  on conflict(id) do update set sku=excluded.sku,slug=excluded.slug,title_override=excluded.title_override,description_override=excluded.description_override,price_minor=excluded.price_minor,compare_at_minor=excluded.compare_at_minor,stock_on_hand=excluded.stock_on_hand,status=excluded.status,is_listed=excluded.is_listed,combination_key=excluded.combination_key,sort_order=excluded.sort_order;
  if stock_v<>coalesce(old_v.stock_on_hand,0) then
   insert into public.homly_inventory_movements(variant_id,delta_on_hand,reason,actor_id) values(vid,stock_v-coalesce(old_v.stock_on_hand,0),'admin_adjustment',auth.uid());
  end if;
  delete from public.homly_variant_option_values where variant_id=vid;
  for kv in select key,value from jsonb_each_text(opts) loop
   insert into public.homly_product_options(product_id,name_ar) values(pid,kv.key) on conflict(product_id,name_ar) do update set name_ar=excluded.name_ar returning id into oid;
   insert into public.homly_option_values(option_id,label_ar) values(oid,kv.value) on conflict(option_id,label_ar) do update set label_ar=excluded.label_ar returning id into val_id;
   insert into public.homly_variant_option_values values(vid,pid,oid,val_id);
  end loop;
  if jsonb_typeof(coalesce(v->'images','[]')) is distinct from 'array' or jsonb_array_length(coalesce(v->'images','[]'))>20 then raise exception 'Invalid variant images';end if;
  seq=0;
  for img in select value from jsonb_array_elements(coalesce(v->'images','[]')) loop
   insert into public.homly_product_images(product_id,variant_id,storage_path,sort_order) values(pid,vid,public.homly_check_image(img#>>'{}'),seq);seq=seq+1;
  end loop;
  if status_v='published' and vstatus='published' and not exists(select 1 from public.homly_product_images where product_id=pid and (variant_id=vid or variant_id is null)) then raise exception 'Published variant requires an image';end if;
 end loop;
 update public.homly_product_variants set status='archived',is_listed=false where product_id=pid and not(id=any(seen_ids));
 if status_v='published' and not exists(select 1 from public.homly_product_variants where product_id=pid and status='published') then raise exception 'Publish at least one variant';end if;
 return pid;
end $$;
revoke all on function public.homly_save_product(jsonb) from public,anon,authenticated;
grant execute on function public.homly_save_product(jsonb) to authenticated;

create or replace function public.homly_checkout_rate_limit(p_key text,p_limit integer default 20)
returns boolean language plpgsql security definer set search_path='' as $$
declare win timestamptz; n integer;begin
 if length(coalesce(p_key,'')) not between 1 and 200 or p_limit not between 1 and 100 then raise exception 'Invalid rate key';end if;
 win=to_timestamp(floor(extract(epoch from now())/900)*900);
 insert into public.homly_checkout_limits(rate_key,window_start,attempts) values(p_key,win,1)
 on conflict(rate_key,window_start) do update set attempts=public.homly_checkout_limits.attempts+1
 where public.homly_checkout_limits.attempts<p_limit returning attempts into n;
 delete from public.homly_checkout_limits where window_start<now()-interval '2 days';
 return n is not null;
end $$;
revoke all on function public.homly_checkout_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.homly_checkout_rate_limit(text,integer) to service_role;

create or replace function public.homly_order_json(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(o)||jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.homly_order_items i where i.order_id=o.id),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(jsonb_build_object('new_status',h.new_status,'created_at',h.created_at) order by h.created_at) from public.homly_order_status_history h where h.order_id=o.id),'[]'::jsonb))
 from public.homly_orders o where o.id=p_id
$$;
revoke all on function public.homly_order_json(uuid) from public,anon,authenticated;

create or replace function public.homly_place_order(payload jsonb,p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare normalized jsonb;item jsonb;r record;v public.homly_product_variants%rowtype;zone public.homly_shipping_zones%rowtype;
 oid uuid;old_req public.homly_order_requests%rowtype;fingerprint text;qty integer;subtotal bigint=0;shipping bigint;opts jsonb;photo text;p_title text;
begin
 if jsonb_typeof(payload) is distinct from 'object' or length(payload::text)>30000 then raise exception 'Invalid order';end if;
 if length(coalesce(payload->>'idempotency_key','')) not between 8 and 100 then raise exception 'Invalid request key';end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 100 then raise exception 'Invalid cart';end if;
 if coalesce(payload->>'payment_method','cod')<>'cod' then raise exception 'Only cash on delivery is enabled';end if;
 if length(trim(coalesce(payload->>'customer_name',''))) not between 2 and 150 or coalesce(payload->>'customer_phone','') !~ '^01[0125][0-9]{8}$'
 or length(trim(coalesce(payload->>'area',''))) not between 1 and 200 or length(trim(coalesce(payload->>'address',''))) not between 8 and 500
 or length(coalesce(payload->>'customer_notes',''))>2000 then raise exception 'Invalid customer/address';end if;
 for item in select value from jsonb_array_elements(payload->'items') loop
  if jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity')::numeric<>trunc((item->>'quantity')::numeric)
  or (item->>'quantity')::numeric not between 1 and 999 or (item->>'variant_id') is null then raise exception 'Invalid quantity';end if;
  perform (item->>'variant_id')::uuid;
 end loop;
 select jsonb_agg(jsonb_build_object('variant_id',q.vid,'quantity',q.qty) order by q.vid) into normalized from
 (select (value->>'variant_id')::uuid vid,sum((value->>'quantity')::integer)::integer qty from jsonb_array_elements(payload->'items') group by 1) q;
 if exists(select 1 from jsonb_array_elements(normalized) where (value->>'quantity')::integer>999) then raise exception 'Quantity limit';end if;
 fingerprint=md5((jsonb_build_object('customer_name',trim(payload->>'customer_name'),'customer_phone',payload->>'customer_phone','governorate',payload->>'governorate','area',trim(payload->>'area'),
 'address',trim(payload->>'address'),'customer_notes',coalesce(payload->>'customer_notes',''),'shipping_zone_id',payload->>'shipping_zone_id','items',normalized,'user_id',p_user_id))::text);
 perform pg_advisory_xact_lock(hashtextextended('homly-order:'||(payload->>'idempotency_key'),0));
 select * into old_req from public.homly_order_requests where idempotency_key=payload->>'idempotency_key';
 if found then
  if old_req.request_hash<>fingerprint or old_req.user_id is distinct from p_user_id then raise exception 'Request key already used for another payload';end if;
  return public.homly_order_json(old_req.order_id);
 end if;
 select * into zone from public.homly_shipping_zones where id=(payload->>'shipping_zone_id')::uuid and is_active for share;
 if not found or zone.governorate<>payload->>'governorate' or (cardinality(zone.areas)>0 and not (trim(payload->>'area')=any(zone.areas))) then raise exception 'Shipping zone/address unavailable';end if;
 shipping=zone.fee_minor;
 -- Hierarchical lock order: family IDs first, then variant IDs, both sorted.
 perform 1 from public.homly_products p where p.id in
 (select vv.product_id from public.homly_product_variants vv join jsonb_array_elements(normalized) j on vv.id=(j.value->>'variant_id')::uuid)
 order by p.id for share;
 perform 1 from public.homly_product_variants vv where vv.id in(select (value->>'variant_id')::uuid from jsonb_array_elements(normalized)) order by vv.id for update;
 for item in select value from jsonb_array_elements(normalized) loop
  select * into v from public.homly_product_variants where id=(item->>'variant_id')::uuid;
  qty=(item->>'quantity')::integer;
  if not found or v.status<>'published' or not public.homly_product_visible(v.product_id) or qty>v.stock_on_hand-v.stock_reserved then raise exception 'Product or requested quantity unavailable';end if;
  subtotal=subtotal+v.price_minor*qty;
 end loop;
 if subtotal<=0 then raise exception 'Empty/invalid total';end if;
 insert into public.homly_orders(user_id,customer_name,customer_phone,governorate,area,address,customer_notes,subtotal_minor,shipping_minor,total_minor,idempotency_key,payment_method,payment_status,fulfillment_status)
 values(p_user_id,trim(payload->>'customer_name'),payload->>'customer_phone',zone.governorate,trim(payload->>'area'),trim(payload->>'address'),left(coalesce(payload->>'customer_notes',''),2000),subtotal,shipping,subtotal+shipping,payload->>'idempotency_key','cod','unpaid','new') returning id into oid;
 for item in select value from jsonb_array_elements(normalized) loop
  select * into v from public.homly_product_variants where id=(item->>'variant_id')::uuid;qty=(item->>'quantity')::integer;
  select title_ar into p_title from public.homly_products where id=v.product_id;
  select coalesce(jsonb_object_agg(o.name_ar,ov.label_ar),'{}'::jsonb) into opts from public.homly_variant_option_values vv join public.homly_product_options o on o.id=vv.option_id join public.homly_option_values ov on ov.id=vv.value_id where vv.variant_id=v.id;
  select storage_path into photo from public.homly_product_images where product_id=v.product_id and (variant_id=v.id or variant_id is null) order by (variant_id is not null) desc,sort_order limit 1;
  insert into public.homly_order_items(order_id,variant_id,product_id,sku_snapshot,title_snapshot,options_snapshot,image_snapshot,unit_price_minor,quantity,line_total_minor)
  values(oid,v.id,v.product_id,v.sku,coalesce(v.title_override,p_title),opts,photo,v.price_minor,qty,v.price_minor*qty);
  update public.homly_product_variants set stock_reserved=stock_reserved+qty where id=v.id;
  insert into public.homly_stock_reservations(order_id,variant_id,quantity) values(oid,v.id,qty);
  insert into public.homly_inventory_movements(variant_id,delta_reserved,reason,order_id) values(v.id,qty,'reserve',oid);
 end loop;
 insert into public.homly_order_status_history(order_id,new_status,note) values(oid,'new','Order received');
 insert into public.homly_order_requests(idempotency_key,order_id,request_hash,user_id) values(payload->>'idempotency_key',oid,fingerprint,p_user_id);
 return public.homly_order_json(oid);
end $$;
revoke all on function public.homly_place_order(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.homly_place_order(jsonb,uuid) to service_role;

create or replace function public.homly_update_order_status(p_order_id uuid,p_status text,p_note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.homly_orders%rowtype;r public.homly_stock_reservations%rowtype;allowed text[];
begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 if length(coalesce(p_note,''))>2000 then raise exception 'Note too long';end if;
 select * into o from public.homly_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found';end if;
 if o.fulfillment_status=p_status then return jsonb_build_object('id',o.id,'status',p_status);end if;
 allowed=case o.fulfillment_status
 when 'new' then array['confirmed','cancelled'] when 'confirmed' then array['preparing','cancelled']
 when 'preparing' then array['shipped','cancelled'] when 'shipped' then array['delivered','delivery_failed','return_requested']
 when 'delivery_failed' then array['shipped','return_requested'] when 'delivered' then array['return_requested']
 when 'return_requested' then array['returned'] else array[]::text[] end;
 if p_status is null or not(p_status=any(allowed)) then raise exception 'Invalid order transition: % to %',o.fulfillment_status,p_status;end if;
 perform 1 from public.homly_products p where p.id in(select product_id from public.homly_product_variants where id in(select variant_id from public.homly_stock_reservations where order_id=o.id)) order by p.id for share;
 perform 1 from public.homly_product_variants v where v.id in(select variant_id from public.homly_stock_reservations where order_id=o.id) order by v.id for update;
 for r in select * from public.homly_stock_reservations where order_id=o.id order by variant_id for update loop
  if p_status='shipped' and r.status='active' then
   update public.homly_product_variants set stock_on_hand=stock_on_hand-r.quantity,stock_reserved=stock_reserved-r.quantity where id=r.variant_id;
   update public.homly_stock_reservations set status='consumed' where id=r.id;
   insert into public.homly_inventory_movements(variant_id,delta_on_hand,delta_reserved,reason,order_id,actor_id) values(r.variant_id,-r.quantity,-r.quantity,'dispatch',o.id,auth.uid());
  elsif p_status='cancelled' and r.status='active' then
   update public.homly_product_variants set stock_reserved=stock_reserved-r.quantity where id=r.variant_id;
   update public.homly_stock_reservations set status='released' where id=r.id;
   insert into public.homly_inventory_movements(variant_id,delta_reserved,reason,order_id,actor_id) values(r.variant_id,-r.quantity,'cancel_release',o.id,auth.uid());
  elsif p_status='returned' and r.status='consumed' then
   update public.homly_product_variants set stock_on_hand=stock_on_hand+r.quantity where id=r.variant_id;
   update public.homly_stock_reservations set status='released' where id=r.id;
   insert into public.homly_inventory_movements(variant_id,delta_on_hand,reason,order_id,actor_id) values(r.variant_id,r.quantity,'returned_after_inspection',o.id,auth.uid());
  end if;
 end loop;
 update public.homly_orders set fulfillment_status=p_status where id=o.id;
 insert into public.homly_order_status_history(order_id,old_status,new_status,actor_id,note) values(o.id,o.fulfillment_status,p_status,auth.uid(),coalesce(p_note,''));
 return jsonb_build_object('id',o.id,'status',p_status);
end $$;
revoke all on function public.homly_update_order_status(uuid,text,text) from public,anon,authenticated;
grant execute on function public.homly_update_order_status(uuid,text,text) to authenticated;

-- Optional trusted collection action; never automatically marks COD as paid on dispatch/delivery.
create or replace function public.homly_mark_cod_paid(p_order_id uuid,p_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare o public.homly_orders%rowtype;begin
 if not public.homly_is_admin() then raise exception 'Admin permission required' using errcode='42501';end if;
 select * into o from public.homly_orders where id=p_order_id for update;
 if not found or o.payment_method<>'cod' or o.fulfillment_status<>'delivered' then raise exception 'Delivered COD order required';end if;
 if o.payment_status='paid' then return;end if;
 if o.payment_status<>'unpaid' then raise exception 'Unexpected payment state';end if;
 update public.homly_orders set payment_status='paid' where id=o.id;
 insert into public.homly_order_status_history(order_id,old_status,new_status,actor_id,note) values(o.id,o.fulfillment_status,o.fulfillment_status,auth.uid(),'COD collection confirmed: '||left(coalesce(p_note,''),1500));
end $$;
revoke all on function public.homly_mark_cod_paid(uuid,text) from public,anon,authenticated;
grant execute on function public.homly_mark_cod_paid(uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
