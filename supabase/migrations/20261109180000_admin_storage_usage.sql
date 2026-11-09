create or replace function public.homly_admin_storage_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.homly_is_admin() is distinct from true then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'databaseBytes', pg_database_size(current_database()),
    'buckets', coalesce((
      select jsonb_agg(to_jsonb(bucket) order by bucket.bytes desc, bucket.name)
      from (
        select b.name, count(o.id) as objects,
          coalesce(sum((o.metadata->>'size')::numeric)
            filter (where o.metadata->>'size' ~ '^[0-9]+$'), 0) as bytes
        from storage.buckets b
        left join storage.objects o on o.bucket_id = b.id
        group by b.id, b.name
      ) bucket
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.homly_admin_storage_usage() from public, anon;
grant execute on function public.homly_admin_storage_usage() to authenticated;
