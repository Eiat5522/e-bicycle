create extension if not exists pgcrypto schema extensions;

create table if not exists public.wallets (
  id uuid primary key references auth.users (id) on delete cascade,
  balance numeric(10, 2) not null default 0,
  points integer not null default 0,
  payment_methods text[] not null default array['Visa **** 4242']::text[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.wallet_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  type text not null check (type in ('ride', 'top_up', 'reward')),
  title text not null,
  subtitle text not null,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists wallet_transactions_wallet_id_created_at_idx
  on public.wallet_transactions (wallet_id, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own"
on public.wallets
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "wallet_transactions_select_own" on public.wallet_transactions;
create policy "wallet_transactions_select_own"
on public.wallet_transactions
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = wallet_id);

create or replace function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), 'Rider')
  )
  on conflict (id) do nothing;

  insert into public.wallets (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.apply_wallet_top_up(
  p_amount numeric,
  p_title text,
  p_subtitle text
)
returns public.wallets
set search_path = ''
as $$
declare
  v_wallet public.wallets;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_amount <= 0 then
    raise exception 'Top-up amount must be positive';
  end if;

  update public.wallets
  set
    balance = balance + p_amount,
    points = points + floor(p_amount * 10)::integer,
    updated_at = timezone('utc'::text, now())
  where id = auth.uid()
  returning * into v_wallet;

  if not found then
    insert into public.wallets (id, balance, points)
    values (
      auth.uid(),
      p_amount,
      floor(p_amount * 10)::integer
    )
    returning * into v_wallet;
  end if;

  insert into public.wallet_transactions (wallet_id, type, title, subtitle, amount)
  values (auth.uid(), 'top_up', p_title, p_subtitle, p_amount);

  return v_wallet;
end;
$$ language plpgsql security definer;

revoke all on function public.apply_wallet_top_up(numeric, text, text) from public;
grant execute on function public.apply_wallet_top_up(numeric, text, text) to authenticated;

drop trigger if exists handle_wallets_updated_at on public.wallets;
create trigger handle_wallets_updated_at
  before update on public.wallets
  for each row execute procedure extensions.moddatetime(updated_at);
