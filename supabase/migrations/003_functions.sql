-- ============================================================
-- Helper functions
-- ============================================================

-- Generate 9-digit public ID (no leading zero issue; range 100000000–999999999)
create or replace function generate_public_id() returns char(9)
language plpgsql as $$
declare
  new_id char(9);
  attempts int := 0;
begin
  loop
    new_id := lpad((100000000 + floor(random() * 900000000)::bigint)::text, 9, '0');
    exit when not exists (select 1 from users where public_id = new_id);
    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'Could not generate unique public ID';
    end if;
  end loop;
  return new_id;
end;
$$;

-- Generate 5-char wallet code (no confusing chars)
create or replace function generate_wallet_code() returns char(5)
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..5 loop
    out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return out;
end;
$$;

-- Award gift (called from Edge Function with service role)
create or replace function process_gift(
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
  v_send_id uuid;
  v_sender_user uuid;
  v_request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if v_request_role = 'authenticated' then
    select user_id into v_sender_user
    from public.wallets where id = p_sender_wallet;

    if v_sender_user is distinct from auth.uid() then
      raise exception 'Sender wallet does not belong to the caller';
    end if;
  elsif v_request_role <> 'service_role' then
    raise exception 'Only authenticated users or the service role may send gifts';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select price_ksh into v_price from public.gifts where id = p_gift_id and active = true;
  if v_price is null then
    raise exception 'Gift not found';
  end if;

  v_total := v_price * p_quantity;

  select balance_ksh into v_sender_balance
  from public.wallets where id = p_sender_wallet for update;

  if v_sender_balance < v_total then
    raise exception 'Insufficient balance';
  end if;

  if not exists (select 1 from public.wallets where id = p_receiver_wallet) then
    raise exception 'Receiver wallet not found';
  end if;

  if p_context_type not in ('help', 'cause') then
    raise exception 'Invalid gift context';
  end if;

  update public.wallets set balance_ksh = balance_ksh - v_total where id = p_sender_wallet;
  update public.wallets set balance_ksh = balance_ksh + v_total,
    has_ever_received_gift = true
  where id = p_receiver_wallet;

  insert into public.gift_sends (sender_wallet_id, receiver_wallet_id, gift_id,
    quantity, total_ksh, context_type, context_id)
  values (p_sender_wallet, p_receiver_wallet, p_gift_id, p_quantity,
    v_total, p_context_type, p_context_id)
  returning id into v_send_id;

  insert into public.wallet_transactions (wallet_id, type, amount_ksh, status)
  values (p_sender_wallet, 'gift_sent', v_total, 'success');

  insert into public.wallet_transactions (wallet_id, type, amount_ksh, status)
  values (p_receiver_wallet, 'gift_received', v_total, 'success');

  return v_send_id;
end;
$$;

revoke execute on function process_gift(uuid, uuid, int, int, text, uuid)
  from public, anon, authenticated;
grant execute on function process_gift(uuid, uuid, int, int, text, uuid)
  to authenticated, service_role;

-- Auto-hide gig when bid limit reached
create or replace function check_gig_bid_limit() returns trigger
language plpgsql as $$
declare
  v_limit int;
  v_count int;
begin
  select bid_limit, bid_count into v_limit, v_count
  from gigs where id = new.gig_id for update;

  if v_count + 1 >= v_limit then
    update gigs set status = 'hidden', hidden_at = now() where id = new.gig_id;
  end if;

  update gigs set bid_count = bid_count + 1 where id = new.gig_id;
  return new;
end;
$$;

create trigger trg_gig_bid_limit
after insert on gig_bids
for each row execute function check_gig_bid_limit();

-- Auto-flag on 10 reports
create or replace function check_report_threshold() returns trigger
language plpgsql as $$
declare
  v_count int;
begin
  select count(*) into v_count from reports
  where target_type = new.target_type and target_id = new.target_id;

  if v_count >= 10 then
    insert into moderation_flags (target_type, target_id, report_count)
    values (new.target_type, new.target_id, v_count)
    on conflict (target_type, target_id)
    do update set report_count = excluded.report_count, flagged_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_report_threshold
after insert on reports
for each row execute function check_report_threshold();

-- Expire content (called from cron)
create or replace function expire_content() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_stories int := 0;
  v_couples int := 0;
  v_help int := 0;
begin
  update public.stories set status = 'expired'
  where status = 'active' and expires_at < now();
  get diagnostics v_stories = row_count;

  update public.couple_posts set status = 'expired'
  where status = 'active' and expires_at < now();
  get diagnostics v_couples = row_count;

  update public.help_posts set status = 'closed', closed_at = now(),
    wallet_code = null, wallet_code_expires_at = null
  where status = 'active' and wallet_code_expires_at < now() and wallet_code is not null;
  get diagnostics v_help = row_count;

  return jsonb_build_object('stories', v_stories, 'couples', v_couples, 'help', v_help);
end;
$$;

revoke execute on function expire_content() from public, anon, authenticated;
grant execute on function expire_content() to service_role;