alter table wallet_transactions
  add column if not exists withdrawal_details jsonb;

create unique index if not exists idx_wallet_transactions_paystack_ref
  on wallet_transactions(paystack_ref)
  where paystack_ref is not null;

create or replace function process_wallet_deposit(
  p_wallet_id uuid,
  p_amount_ksh numeric,
  p_paystack_ref text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_transaction_id uuid;
begin
  if coalesce(p_amount_ksh, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select id into v_transaction_id
  from public.wallet_transactions
  where paystack_ref = p_paystack_ref
  for update;

  if v_transaction_id is null then
    raise exception 'Pending deposit not found';
  end if;

  if exists (
    select 1 from public.wallet_transactions
    where paystack_ref = p_paystack_ref and status = 'success'
  ) then
    return;
  end if;

  update public.wallet_transactions
  set status = 'success', amount_ksh = p_amount_ksh
  where id = v_transaction_id;

  update public.wallets
  set balance_ksh = balance_ksh + p_amount_ksh
  where id = p_wallet_id;
end;
$$;

revoke execute on function process_wallet_deposit(uuid, numeric, text) from public, anon, authenticated;
grant execute on function process_wallet_deposit(uuid, numeric, text) to service_role;
