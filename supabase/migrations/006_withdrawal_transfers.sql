alter table public.wallets
  add column if not exists reserved_ksh numeric(12,2) not null default 0
    check (reserved_ksh >= 0);

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_status_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_status_check
  check (status in ('pending', 'processing', 'success', 'failed'));
alter table public.wallet_transactions
  add column if not exists withdrawal_transfer_code text,
  add column if not exists withdrawal_transfer_status text,
  add column if not exists withdrawal_approved_by uuid references public.users(id),
  add column if not exists withdrawal_approved_at timestamptz,
  add column if not exists withdrawal_error text;

-- The previous withdrawal flow deducted funds when a request was submitted.
-- Return those old pending requests to users and ask them to submit with payout details.
with legacy_pending as (
  select wallet_id, sum(amount_ksh) as amount_ksh
  from public.wallet_transactions
  where type = 'withdrawal' and status = 'pending'
  group by wallet_id
)
update public.wallets w
set balance_ksh = w.balance_ksh + legacy_pending.amount_ksh
from legacy_pending
where w.id = legacy_pending.wallet_id;

insert into public.system_messages (user_id, type, title, body)
select w.user_id, 'withdrawal', 'Withdrawal request needs resubmission',
  'Your earlier pending withdrawal was returned to your wallet. Please submit a new request with your M-Pesa or bank payout details.'
from public.wallet_transactions t
join public.wallets w on w.id = t.wallet_id
where t.type = 'withdrawal' and t.status = 'pending';

update public.wallet_transactions
set status = 'failed', withdrawal_error = 'Previous request was returned; resubmit with payout details.'
where type = 'withdrawal' and status = 'pending';

create or replace function public.reserve_wallet_withdrawal(
  p_transaction_id uuid,
  p_admin_id uuid
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_wallet_id uuid;
  v_amount numeric(12,2);
  v_status text;
  v_balance numeric(12,2);
  v_reserved numeric(12,2);
begin
  select wallet_id, amount_ksh, status into v_wallet_id, v_amount, v_status
  from public.wallet_transactions
  where id = p_transaction_id and type = 'withdrawal'
  for update;

  if v_wallet_id is null then raise exception 'Withdrawal not found'; end if;
  if v_status <> 'pending' then raise exception 'Withdrawal is no longer awaiting approval'; end if;

  select balance_ksh, reserved_ksh into v_balance, v_reserved
  from public.wallets where id = v_wallet_id for update;
  if v_balance - v_reserved < v_amount then raise exception 'Insufficient available wallet balance'; end if;

  update public.wallets set reserved_ksh = reserved_ksh + v_amount where id = v_wallet_id;
  update public.wallet_transactions
  set status = 'processing', withdrawal_approved_by = p_admin_id,
      withdrawal_approved_at = now(), withdrawal_error = null
  where id = p_transaction_id;
end;
$$;

create or replace function public.finish_wallet_withdrawal(
  p_paystack_ref text,
  p_transfer_status text,
  p_transfer_code text default null,
  p_error text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_transaction_id uuid;
  v_wallet_id uuid;
  v_amount numeric(12,2);
  v_status text;
  v_previous_transfer_status text;
  v_user_id uuid;
begin
  if p_transfer_status not in ('success', 'failed', 'reversed') then
    raise exception 'Invalid transfer status';
  end if;

  select id, wallet_id, amount_ksh, status, withdrawal_transfer_status
    into v_transaction_id, v_wallet_id, v_amount, v_status, v_previous_transfer_status
  from public.wallet_transactions
  where paystack_ref = p_paystack_ref and type = 'withdrawal'
  for update;

  if v_transaction_id is null then raise exception 'Withdrawal not found'; end if;
  if p_transfer_status = 'reversed' then
    if v_previous_transfer_status = 'reversed' then return; end if;
    select user_id into v_user_id from public.wallets where id = v_wallet_id for update;
    if v_status = 'success' then
      update public.wallets set balance_ksh = balance_ksh + v_amount where id = v_wallet_id;
    elsif v_status = 'processing' then
      if (select reserved_ksh from public.wallets where id = v_wallet_id) < v_amount then
        raise exception 'Withdrawal reserve is inconsistent';
      end if;
      update public.wallets set reserved_ksh = reserved_ksh - v_amount where id = v_wallet_id;
    elsif v_status = 'failed' then
      return;
    else
      raise exception 'Withdrawal cannot be reversed in its current state';
    end if;
    update public.wallet_transactions
      set status = 'failed', withdrawal_transfer_status = 'reversed',
          withdrawal_error = coalesce(p_error, 'Paystack reversed this transfer'),
          withdrawal_transfer_code = coalesce(p_transfer_code, withdrawal_transfer_code)
      where id = v_transaction_id;
    insert into public.system_messages (user_id, type, title, body)
    values (v_user_id, 'withdrawal', 'Withdrawal reversed',
      'Paystack reversed your withdrawal of Ksh ' || v_amount::text || '. The funds have been returned to your wallet.');
  else
    if v_status = 'success' or v_status = 'failed' then return; end if;
    if v_status <> 'processing' then raise exception 'Withdrawal is not processing'; end if;

    select user_id into v_user_id from public.wallets where id = v_wallet_id for update;
    if (select reserved_ksh from public.wallets where id = v_wallet_id) < v_amount then
      raise exception 'Withdrawal reserve is inconsistent';
    end if;

    if p_transfer_status = 'success' then
      update public.wallets
      set balance_ksh = balance_ksh - v_amount, reserved_ksh = reserved_ksh - v_amount
      where id = v_wallet_id;
      update public.wallet_transactions
      set status = 'success', withdrawal_transfer_status = 'success', withdrawal_error = null,
          withdrawal_transfer_code = coalesce(p_transfer_code, withdrawal_transfer_code)
      where id = v_transaction_id;
      insert into public.system_messages (user_id, type, title, body)
      values (v_user_id, 'withdrawal', 'Withdrawal complete',
        'Your withdrawal of Ksh ' || v_amount::text || ' was sent successfully.');
    else
      update public.wallets set reserved_ksh = reserved_ksh - v_amount where id = v_wallet_id;
      update public.wallet_transactions
      set status = 'failed', withdrawal_transfer_status = 'failed',
          withdrawal_error = coalesce(p_error, 'Paystack could not complete this transfer'),
          withdrawal_transfer_code = coalesce(p_transfer_code, withdrawal_transfer_code)
      where id = v_transaction_id;
      insert into public.system_messages (user_id, type, title, body)
      values (v_user_id, 'withdrawal', 'Withdrawal failed',
        'Your withdrawal of Ksh ' || v_amount::text || ' failed. The funds remain in your wallet.');
    end if;
  end if;
end;
$$;

revoke execute on function public.reserve_wallet_withdrawal(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.finish_wallet_withdrawal(text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_wallet_withdrawal(uuid, uuid) to service_role;
grant execute on function public.finish_wallet_withdrawal(text, text, text, text) to service_role;

create or replace function public.process_gift(
  p_sender_wallet uuid,
  p_receiver_wallet uuid,
  p_gift_id int,
  p_quantity int,
  p_context_type text,
  p_context_id uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_price numeric;
  v_total numeric;
  v_sender_balance numeric;
  v_sender_reserved numeric;
  v_send_id uuid;
  v_sender_user uuid;
  v_request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if v_request_role = 'authenticated' then
    select user_id into v_sender_user from public.wallets where id = p_sender_wallet;
    if v_sender_user is distinct from auth.uid() then raise exception 'Sender wallet does not belong to the caller'; end if;
  elsif v_request_role <> 'service_role' then
    raise exception 'Only authenticated users or the service role may send gifts';
  end if;
  if p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  select price_ksh into v_price from public.gifts where id = p_gift_id and active = true;
  if v_price is null then raise exception 'Gift not found'; end if;
  v_total := v_price * p_quantity;
  select balance_ksh, reserved_ksh into v_sender_balance, v_sender_reserved
  from public.wallets where id = p_sender_wallet for update;
  if v_sender_balance - v_sender_reserved < v_total then raise exception 'Insufficient available balance'; end if;
  if not exists (select 1 from public.wallets where id = p_receiver_wallet) then raise exception 'Receiver wallet not found'; end if;
  if p_context_type not in ('help', 'cause') then raise exception 'Invalid gift context'; end if;

  update public.wallets set balance_ksh = balance_ksh - v_total where id = p_sender_wallet;
  update public.wallets set balance_ksh = balance_ksh + v_total, has_ever_received_gift = true where id = p_receiver_wallet;
  insert into public.gift_sends (sender_wallet_id, receiver_wallet_id, gift_id, quantity, total_ksh, context_type, context_id)
  values (p_sender_wallet, p_receiver_wallet, p_gift_id, p_quantity, v_total, p_context_type, p_context_id)
  returning id into v_send_id;
  insert into public.wallet_transactions (wallet_id, type, amount_ksh, status)
  values (p_sender_wallet, 'gift_sent', v_total, 'success');
  insert into public.wallet_transactions (wallet_id, type, amount_ksh, status)
  values (p_receiver_wallet, 'gift_received', v_total, 'success');
  return v_send_id;
end;
$$;

revoke execute on function public.process_gift(uuid, uuid, int, int, text, uuid) from public, anon, authenticated;
grant execute on function public.process_gift(uuid, uuid, int, int, text, uuid) to authenticated, service_role;
