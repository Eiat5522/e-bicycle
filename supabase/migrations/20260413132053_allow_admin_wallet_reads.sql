drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own"
on public.wallets
for select
to authenticated
using (
  ((select auth.uid()) is not null and (select auth.uid()) = id)
  or private.is_admin()
);

drop policy if exists "wallet_transactions_select_own" on public.wallet_transactions;
create policy "wallet_transactions_select_own"
on public.wallet_transactions
for select
to authenticated
using (
  ((select auth.uid()) is not null and (select auth.uid()) = wallet_id)
  or private.is_admin()
);
