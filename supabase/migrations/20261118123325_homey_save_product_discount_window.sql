CREATE OR REPLACE FUNCTION public.homly_save_product(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare pid uuid;vid uuid;cid uuid;oid uuid;val_id uuid;v jsonb;img jsonb;kv record;
 old_v public.homly_product_variants%rowtype;kind_v text;mode_v text;status_v text;vstatus text;
 opts jsonb;k text;existing_paths text[];expected_keys text[];current_keys text[];seen_ids uuid[]='{}';seen_keys text[]='{}';kept boolean;seq integer;price_v bigint;stock_v integer;
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
 select coalesce(array_agg(storage_path),ARRAY[]::text[]) into existing_paths from public.homly_product_images where product_id=pid;
 delete from public.homly_product_images where product_id=pid;
 seq=0;
 for img in select value from jsonb_array_elements(coalesce(payload->'images','[]')) loop
  insert into public.homly_product_images(product_id,storage_path,sort_order) values(pid,case when (img#>>'{}') = any(existing_paths) then (img#>>'{}') else public.homly_check_image(img#>>'{}') end,seq);seq=seq+1;
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
  if nullif(v->>'discount_starts_at','') is not null and nullif(v->>'discount_ends_at','') is null then raise exception 'Discount end time is required';end if;
  if nullif(v->>'discount_ends_at','') is not null and (nullif(v->>'compare_at_minor','')::bigint is null or nullif(v->>'compare_at_minor','')::bigint<=price_v or (nullif(v->>'discount_starts_at','') is not null and nullif(v->>'discount_ends_at','')::timestamptz<=nullif(v->>'discount_starts_at','')::timestamptz)) then raise exception 'Invalid discount window';end if;
  if length(trim(coalesce(v->>'sku','')))=0 or length(v->>'sku')>100 or coalesce(v->>'slug','') !~ '^[^/?#[:space:]]{1,200}$' then raise exception 'Valid SKU and slug required';end if;
  vstatus=case when v->>'status'='archived' then 'archived' else status_v end;
  insert into public.homly_product_variants(id,product_id,sku,slug,title_override,description_override,price_minor,compare_at_minor,discount_starts_at,discount_ends_at,stock_on_hand,stock_reserved,status,is_listed,combination_key,sort_order)
  values(vid,pid,trim(v->>'sku'),v->>'slug',nullif(v->>'title_override',''),nullif(v->>'description_override',''),price_v,nullif(v->>'compare_at_minor','')::bigint,nullif(v->>'discount_starts_at','')::timestamptz,nullif(v->>'discount_ends_at','')::timestamptz,stock_v,coalesce(old_v.stock_reserved,0),vstatus,coalesce((v->>'is_listed')::boolean,true),k,coalesce((v->>'sort_order')::integer,0))
  on conflict(id) do update set sku=excluded.sku,slug=excluded.slug,title_override=excluded.title_override,description_override=excluded.description_override,price_minor=excluded.price_minor,compare_at_minor=excluded.compare_at_minor,discount_starts_at=excluded.discount_starts_at,discount_ends_at=excluded.discount_ends_at,stock_on_hand=excluded.stock_on_hand,status=excluded.status,is_listed=excluded.is_listed,combination_key=excluded.combination_key,sort_order=excluded.sort_order;
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
   insert into public.homly_product_images(product_id,variant_id,storage_path,sort_order) values(pid,vid,case when (img#>>'{}') = any(existing_paths) then (img#>>'{}') else public.homly_check_image(img#>>'{}') end,seq);seq=seq+1;
  end loop;
  if status_v='published' and vstatus='published' and not exists(select 1 from public.homly_product_images where product_id=pid and (variant_id=vid or variant_id is null)) then raise exception 'Published variant requires an image';end if;
 end loop;
 update public.homly_product_variants set status='archived',is_listed=false where product_id=pid and not(id=any(seen_ids));
 if status_v='published' and not exists(select 1 from public.homly_product_variants where product_id=pid and status='published') then raise exception 'Publish at least one variant';end if;
 return pid;
end $function$
