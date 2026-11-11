-- The webhook and VAPID keys are provisioned separately in Vault.
create schema if not exists homey_private;

create or replace function public.homly_order_push_delivery(p_token text, p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'url', n.url,
    'public_key', keys.decrypted_secret::jsonb->>'publicKey',
    'private_key', keys.decrypted_secret::jsonb->>'privateKey',
    'devices', coalesce((
      select jsonb_agg(s.subscription)
      from public.homly_push_subscriptions s
      where exists (
        select 1 from public.homly_user_roles r
        where r.user_id = s.user_id and r.role = 'admin'
      )
    ), '[]'::jsonb)
  )
  from public.homly_admin_notifications n
  join vault.decrypted_secrets keys on keys.name = 'homey_order_push_vapid'
  where n.id = p_id and n.kind = 'order'
    and n.created_at > now() - interval '1 hour'
    and exists (
      select 1 from vault.decrypted_secrets secret
      where secret.name = 'homey_order_push_token' and secret.decrypted_secret = p_token
    );
$$;
revoke all on function public.homly_order_push_delivery(text, uuid) from public, anon, authenticated;
grant execute on function public.homly_order_push_delivery(text, uuid) to service_role;

-- Limit vault access to this narrowly scoped function.
alter function public.homly_order_push_delivery(text, uuid) security definer;

create or replace function homey_private.queue_order_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
  target text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'homey_order_push_token';
  select decrypted_secret into target from vault.decrypted_secrets where name = 'homey_order_push_url';
  if token is not null and target is not null then
    perform net.http_post(
      url := target,
      body := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-homey-push-token', token),
      timeout_milliseconds := 15000
    );
  end if;
  return new;
exception when others then
  -- Delivery errors must never cancel an order or its inbox notification.
  raise log 'Homey order push enqueue failed: %', sqlstate;
  return new;
end;
$$;
revoke all on function homey_private.queue_order_push() from public, anon, authenticated;
drop trigger if exists homey_order_push on public.homly_admin_notifications;
create trigger homey_order_push
after insert on public.homly_admin_notifications
for each row when (new.kind = 'order')
execute function homey_private.queue_order_push();
