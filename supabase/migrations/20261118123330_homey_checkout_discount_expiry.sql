CREATE OR REPLACE FUNCTION public.homly_place_order(payload jsonb, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  subtotal=subtotal+(case when v.compare_at_minor is not null and v.compare_at_minor>v.price_minor and (v.discount_starts_at is null or v.discount_starts_at<=now()) and (v.discount_ends_at is null or now()<v.discount_ends_at) then v.price_minor else coalesce(v.compare_at_minor,v.price_minor) end)*qty;
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
  values(oid,v.id,v.product_id,v.sku,coalesce(v.title_override,p_title),opts,photo,case when v.compare_at_minor is not null and v.compare_at_minor>v.price_minor and (v.discount_starts_at is null or v.discount_starts_at<=now()) and (v.discount_ends_at is null or now()<v.discount_ends_at) then v.price_minor else coalesce(v.compare_at_minor,v.price_minor) end,qty,(case when v.compare_at_minor is not null and v.compare_at_minor>v.price_minor and (v.discount_starts_at is null or v.discount_starts_at<=now()) and (v.discount_ends_at is null or now()<v.discount_ends_at) then v.price_minor else coalesce(v.compare_at_minor,v.price_minor) end)*qty);
  update public.homly_product_variants set stock_reserved=stock_reserved+qty where id=v.id;
  insert into public.homly_stock_reservations(order_id,variant_id,quantity) values(oid,v.id,qty);
  insert into public.homly_inventory_movements(variant_id,delta_reserved,reason,order_id) values(v.id,qty,'reserve',oid);
 end loop;
 insert into public.homly_order_status_history(order_id,new_status,note) values(oid,'new','Order received');
 insert into public.homly_order_requests(idempotency_key,order_id,request_hash,user_id) values(payload->>'idempotency_key',oid,fingerprint,p_user_id);
 return public.homly_order_json(oid);
end $function$
