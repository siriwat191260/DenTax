-- ============================================================
-- DentaLedger — Supabase Migration 001
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- RECEIPTS TABLE
-- ============================================================
create table public.receipts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  date         date not null,
  income_type  text not null default '40-6'
                 check (income_type in ('40-1', '40-2', '40-6')),
  category     text not null,
  patient      text,
  payment      text not null default 'เงินสด',
  total        numeric(12, 2) not null check (total >= 0),
  note         text,
  image_url    text,
  items        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Index for common queries
create index receipts_user_id_idx     on public.receipts(user_id);
create index receipts_date_idx        on public.receipts(date);
create index receipts_income_type_idx on public.receipts(income_type);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger receipts_updated_at
  before update on public.receipts
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TAX SETTINGS TABLE (per user, per year)
-- ============================================================
create table public.tax_settings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  tax_year         int not null,
  income_type      text not null default '40-6'
                     check (income_type in ('40-1', '40-2', '40-6')),
  deduct_personal  numeric(12, 2) not null default 60000,
  deduct_spouse    numeric(12, 2) not null default 0,
  deduct_child     numeric(12, 2) not null default 0,
  deduct_parent    numeric(12, 2) not null default 0,
  deduct_life_ins  numeric(12, 2) not null default 0,
  deduct_health_ins numeric(12, 2) not null default 0,
  deduct_rmf       numeric(12, 2) not null default 0,
  deduct_ssf       numeric(12, 2) not null default 0,
  deduct_pvd       numeric(12, 2) not null default 0,
  deduct_other     numeric(12, 2) not null default 0,
  extra_income     numeric(12, 2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(user_id, tax_year)
);

create trigger tax_settings_updated_at
  before update on public.tax_settings
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.receipts     enable row level security;
alter table public.tax_settings enable row level security;

-- Receipts: users can only see/modify their own data
create policy "receipts_select" on public.receipts
  for select using (auth.uid() = user_id);

create policy "receipts_insert" on public.receipts
  for insert with check (auth.uid() = user_id);

create policy "receipts_update" on public.receipts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "receipts_delete" on public.receipts
  for delete using (auth.uid() = user_id);

-- Tax settings: same
create policy "tax_settings_select" on public.tax_settings
  for select using (auth.uid() = user_id);

create policy "tax_settings_insert" on public.tax_settings
  for insert with check (auth.uid() = user_id);

create policy "tax_settings_update" on public.tax_settings
  for update using (auth.uid() = user_id);

create policy "tax_settings_delete" on public.tax_settings
  for delete using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET for receipt images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false);

-- Only allow authenticated users to upload to their own folder
create policy "receipts_storage_select" on storage.objects
  for select using (
    bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- HELPER VIEW: income summary by month
-- ============================================================
create or replace view public.income_summary as
select
  user_id,
  date_trunc('month', date)::date as month,
  income_type,
  count(*)                        as count,
  sum(total)                      as total
from public.receipts
group by user_id, date_trunc('month', date)::date, income_type;

-- RLS on view (via security invoker)
alter view public.income_summary owner to authenticated;
