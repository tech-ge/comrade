-- ============================================================
-- Row Level Security
-- ============================================================

alter table users enable row level security;
alter table universities enable row level security;
alter table counties enable row level security;
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table gifts enable row level security;
alter table gift_sends enable row level security;
alter table gigs enable row level security;
alter table gig_bids enable row level security;
alter table help_posts enable row level security;
alter table help_confirmations enable row level security;
alter table couple_posts enable row level security;
alter table couple_applications enable row level security;
alter table couple_matches enable row level security;
alter table stories enable row level security;
alter table story_reactions enable row level security;
alter table comments enable row level security;
alter table anonymous_posts enable row level security;
alter table anonymous_replies enable row level security;
alter table advice_posts enable row level security;
alter table advice_reactions enable row level security;
alter table reports enable row level security;
alter table moderation_flags enable row level security;
alter table audit_log enable row level security;
alter table deletion_summaries enable row level security;
alter table system_messages enable row level security;
alter table suggestions enable row level security;
alter table causes enable row level security;
alter table cause_donations enable row level security;
alter table cause_allocations enable row level security;
alter table sponsor_accounts enable row level security;
alter table sponsors_guest enable row level security;
alter table legal_documents enable row level security;
alter table platform_pool enable row level security;

-- Helper functions
create or replace function current_user_university() returns uuid
language sql stable security definer set search_path = ''
as $$
  select university_id from public.users where id = auth.uid();
$$;

create or replace function current_user_county() returns int
language sql stable security definer set search_path = ''
as $$
  select home_county_id from public.users where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

create or replace function has_mfa() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((auth.jwt()->>'aal') = 'aal2', false);
$$;

revoke execute on function current_user_university() from public, anon, authenticated;
revoke execute on function current_user_county() from public, anon, authenticated;
revoke execute on function is_admin() from public, anon, authenticated;
revoke execute on function has_mfa() from public, anon, authenticated;

grant execute on function current_user_university() to authenticated, service_role;
grant execute on function current_user_county() to authenticated, service_role;
grant execute on function is_admin() to authenticated, service_role;
grant execute on function has_mfa() to authenticated, service_role;
grant execute on function current_user_university() to anon;
grant execute on function current_user_county() to anon;
grant execute on function is_admin() to anon;
grant execute on function has_mfa() to anon;

create or replace function protect_user_profile_fields() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if request_role = 'service_role' then
    return new;
  end if;
 
  if old.role is distinct from new.role then
    raise exception 'Only service role may change user roles';
  end if;

  if not public.is_admin() then
    if new.id is distinct from old.id
      or new.university_id is distinct from old.university_id
      or new.public_id is distinct from old.public_id
      or new.first_name is distinct from old.first_name
      or new.full_name is distinct from old.full_name
      or new.adm_number is distinct from old.adm_number
      or new.email is distinct from old.email
      or new.phone is distinct from old.phone
      or new.course is distinct from old.course
      or new.year_of_study is distinct from old.year_of_study
      or new.campus is distinct from old.campus
      or new.gender is distinct from old.gender
      or new.home_county_id is distinct from old.home_county_id
      or new.selfie_url is distinct from old.selfie_url
      or new.id_photo_url is distinct from old.id_photo_url
      or new.verified is distinct from old.verified
      or new.suspended is distinct from old.suspended
      or new.suspension_reason is distinct from old.suspension_reason
    then
      raise exception 'Only profile photo and dark mode may be changed by the user';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_user_profile_fields on users;
create trigger trg_protect_user_profile_fields
before update on users
for each row execute function protect_user_profile_fields();

create or replace function protect_wallet_balance() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if request_role = 'service_role' or current_user = 'postgres' then
    return new;
  end if;
  if old.balance_ksh is distinct from new.balance_ksh then
    raise exception 'Wallet balances may only be changed by the server';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_wallet_balance on wallets;
create trigger trg_protect_wallet_balance
before update on wallets
for each row execute function protect_wallet_balance();

-- ---------- UNIVERSITIES & COUNTIES: public read ----------
create policy "universities public read" on universities for select using (true);
create policy "counties public read" on counties for select using (true);
create policy "legal public read" on legal_documents for select using (true);
create policy "gifts public read" on gifts for select using (true);

-- ---------- USERS ----------
create policy "user sees own profile" on users
  for select using (id = auth.uid() or is_admin());

create policy "user updates own changeable fields" on users
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
  );

create policy "admin manages users" on users
  for all using (is_admin());

-- ---------- WALLETS ----------
create policy "user sees own wallet" on wallets
  for select using (user_id = auth.uid() or is_admin());

create policy "wallet tx own or admin" on wallet_transactions
  for select using (
    wallet_id in (select id from wallets where user_id = auth.uid())
    or is_admin()
  );

-- ---------- GIGS ----------
create policy "gigs visible by scope" on gigs
  for select using (
    status = 'active' and (
      is_admin()
      or scope = 'country'
      or university_id = current_user_university()
    )
  );

create policy "user creates own gig" on gigs
  for insert with check (user_id = auth.uid());

create policy "user updates own gig" on gigs
  for update using (user_id = auth.uid() or is_admin());

-- Private fields: create a view for public consumption
create or replace view gigs_public as
select id, user_id, university_id, title, description, scope, bid_limit,
       bid_count, status, created_at
from gigs
where status = 'active';
alter view gigs_public set (security_invoker = true);

-- ---------- GIG BIDS ----------
create policy "bidder sees own bids" on gig_bids
  for select using (bidder_id = auth.uid() or is_admin());

create policy "poster sees bids on own gig" on gig_bids
  for select using (
    gig_id in (select id from gigs where user_id = auth.uid())
    or is_admin()
  );

create policy "user inserts bid" on gig_bids
  for insert with check (bidder_id = auth.uid());

-- ---------- HELP ----------
create policy "help school only" on help_posts
  for select using (
    is_admin()
    or university_id = current_user_university()
  );

create policy "user creates help" on help_posts
  for insert with check (user_id = auth.uid());

create policy "user updates own help" on help_posts
  for update using (user_id = auth.uid() or is_admin());

-- ---------- COUPLES ----------
create policy "couples gender gated" on couple_posts
  for select using (
    is_admin()
    or (
      status = 'active'
      and looking_for_gender = (select gender from users where id = auth.uid())
      and (
        target_scope = 'country'
        or (target_scope = 'county' and target_county_id = current_user_county())
        or (target_scope = 'school' and university_id = current_user_university())
      )
    )
  );

create policy "user creates couple post" on couple_posts
  for insert with check (user_id = auth.uid());

create policy "user updates own couple post" on couple_posts
  for update using (user_id = auth.uid() or is_admin());

create policy "applicant sees own application" on couple_applications
  for select using (applicant_id = auth.uid() or is_admin());

create policy "poster sees applications" on couple_applications
  for select using (
    post_id in (select id from couple_posts where user_id = auth.uid())
    or is_admin()
  );

create policy "user applies" on couple_applications
  for insert with check (applicant_id = auth.uid());

create policy "poster updates application" on couple_applications
  for update using (
    post_id in (select id from couple_posts where user_id = auth.uid())
    or is_admin()
  );

create policy "matches visible to parties" on couple_matches
  for select using (
    applicant_id = auth.uid()
    or post_id in (select id from couple_posts where user_id = auth.uid())
    or is_admin()
  );

-- ---------- STORIES ----------
create policy "stories visible by scope" on stories
  for select using (
    status = 'active'
    and expires_at > now()
    and (
      is_admin()
      or target_scope = 'country'
      or (target_scope = 'county' and target_county_id = current_user_county())
      or (target_scope = 'school' and university_id = current_user_university())
    )
  );

create policy "user creates story" on stories
  for insert with check (user_id = auth.uid());

create policy "user updates own story" on stories
  for update using (user_id = auth.uid() or is_admin());

create policy "reactions visible with story" on story_reactions
  for select using (
    story_id in (select id from stories where status = 'active')
  );

create policy "user inserts reaction" on story_reactions
  for insert with check (user_id = auth.uid());

create policy "comments visible with story" on comments
  for select using (
    story_id in (select id from stories where status = 'active')
  );

create policy "user inserts comment" on comments
  for insert with check (user_id = auth.uid());

-- ---------- ANONYMOUS ----------
create policy "anonymous posts visible by scope" on anonymous_posts
  for select using (
    is_admin()
    or target_scope = 'country'
    or (target_scope = 'county' and target_county_id = current_user_county())
    or (target_scope = 'school' and university_id = current_user_university())
  );

create policy "user creates anonymous post" on anonymous_posts
  for insert with check (user_id = auth.uid() and has_mfa());

create policy "admin flags anonymous" on anonymous_posts
  for update using (is_admin());

-- Public view hides user_id
create or replace view anonymous_posts_public as
select id, body, target_scope, target_county_id, university_id, created_at
from anonymous_posts;
alter view anonymous_posts_public set (security_invoker = true);

create policy "anonymous replies visible" on anonymous_replies
  for select using (
    post_id in (
      select id from anonymous_posts
      where is_admin()
        or target_scope = 'country'
        or (target_scope = 'county' and target_county_id = current_user_county())
        or (target_scope = 'school' and university_id = current_user_university())
    )
  );

create policy "user replies anonymously" on anonymous_replies
  for insert with check (replier_id = auth.uid());

-- ---------- ADVICE ----------
create policy "advice school only" on advice_posts
  for select using (
    is_admin()
    or university_id = current_user_university()
  );

create policy "user creates advice" on advice_posts
  for insert with check (user_id = auth.uid());

create policy "advice reactions visible" on advice_reactions
  for select using (
    post_id in (select id from advice_posts where university_id = current_user_university())
    or is_admin()
  );

create policy "user inserts advice reaction" on advice_reactions
  for insert with check (user_id = auth.uid());

-- ---------- REPORTS ----------
create policy "user creates report" on reports
  for insert with check (reporter_id = auth.uid());

create policy "admin reads reports" on reports
  for select using (is_admin());

create policy "admin manages flags" on moderation_flags
  for all using (is_admin());

create policy "admin reads audit" on audit_log
  for select using (is_admin());

-- ---------- SYSTEM MESSAGES ----------
create policy "user reads own messages" on system_messages
  for select using (user_id = auth.uid() or is_admin());

-- ---------- SUGGESTIONS ----------
create policy "user creates suggestion" on suggestions
  for insert with check (user_id = auth.uid());

create policy "user reads own suggestions" on suggestions
  for select using (user_id = auth.uid() or is_admin());

create policy "admin replies" on suggestions
  for update using (is_admin());

-- ---------- SPONSORS ----------
create policy "causes public read" on causes
  for select using (status = 'active');

create policy "admin manages causes" on causes
  for all using (is_admin());

create policy "sponsor sees own donations" on cause_donations
  for select using (
    sponsor_account_id in (select id from sponsor_accounts where email = auth.jwt()->>'email')
    or is_admin()
  );

create policy "allocations admin only" on cause_allocations
  for all using (is_admin());

create policy "platform pool admin" on platform_pool
  for all using (is_admin());

-- ---------- MFA-REQUIRED TABLES ----------
-- Anonymous posting requires MFA (aal2). The check is combined with ownership
-- so permissive policies cannot bypass it.
drop policy if exists "anonymous post requires mfa" on anonymous_posts;