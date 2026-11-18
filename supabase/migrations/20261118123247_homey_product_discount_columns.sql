alter table public.homly_product_variants
  add column if not exists discount_starts_at timestamptz,
  add column if not exists discount_ends_at timestamptz;
