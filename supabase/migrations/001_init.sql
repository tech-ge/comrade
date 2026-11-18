-- Paste the full 30-table schema here (from SPEC.md section 7)
-- Placeholder — will be replaced with full DDL in next message.
-- ============================================================
-- Comrade Hub Kenya — Initial Schema (30 tables)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- IDENTITY ----------
create table universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email_domain text not null unique,
  created_at timestamptz not null default now()
);

create table counties (
  id serial primary key,
  name text not null unique
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  university_id uuid not null references universities(id),
  public_id char(9) not null unique,
  first_name text not null,
  full_name text not null,
  adm_number text not null unique,
  email text not null unique,
  phone text not null,
  course text not null,
  year_of_study int not null,
  campus text not null,
  gender text not null check (gender in ('male','female')),
  home_county_id int references counties(id),
  selfie_url text,
  id_photo_url text,
  profile_photo_url text,
  role text not null default 'user' check (role in ('user','admin','sponsor')),
  dark_mode boolean not null default false,
  suspended boolean not null default false,
  suspension_reason text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- WALLET ----------
create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  balance_ksh numeric(12,2) not null default 0,
  has_ever_received_gift boolean not null default false,
  created_at timestamptz not null default now()
);

create table platform_pool (
  id int primary key default 1 check (id = 1),
  balance_ksh numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);
insert into platform_pool (id, balance_ksh) values (1, 0);

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id),
  type text not null check (type in ('deposit','withdrawal','gift_sent','gift_received','allocation')),
  amount_ksh numeric(12,2) not null,
  paystack_ref text,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  created_at timestamptz not null default now()
);

create table gifts (
  id serial primary key,
  name text not null,
  icon_url text not null,
  price_ksh int not null,
  active boolean not null default true
);

create table gift_sends (
  id uuid primary key default gen_random_uuid(),
  sender_wallet_id uuid not null references wallets(id),
  receiver_wallet_id uuid not null references wallets(id),
  gift_id int not null references gifts(id),
  quantity int not null default 1 check (quantity > 0),
  total_ksh numeric(12,2) not null,
  context_type text not null check (context_type in ('help','cause')),
  context_id uuid not null,
  created_at timestamptz not null default now()
);

-- ---------- SPONSORS ----------
create table sponsor_accounts (
  id uuid primary key default gen_random_uuid(),
  sponsor_code text not null unique,
  name text not null,
  email text not null unique,
  phone text,
  password_hash text not null,
  organization text,
  created_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table sponsors_guest (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table causes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references users(id),
  title text not null,
  description text not null,
  university_id uuid references universities(id),
  county_id int references counties(id),
  goal_ksh numeric(12,2) not null,
  raised_ksh numeric(12,2) not null default 0,
  image_url text,
  status text not null default 'active' check (status in ('active','closed','paused')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table cause_donations (
  id uuid primary key default gen_random_uuid(),
  sponsor_account_id uuid references sponsor_accounts(id),
  guest_sponsor_id uuid references sponsors_guest(id),
  cause_id uuid references causes(id),
  pool_donation boolean not null default false,
  amount_ksh numeric(12,2) not null,
  paystack_ref text,
  created_at timestamptz not null default now(),
  check (
    (pool_donation = true and cause_id is null) or
    (pool_donation = false and cause_id is not null)
  )
);

create table cause_allocations (
  id uuid primary key default gen_random_uuid(),
  cause_id uuid not null references causes(id),
  recipient_user_id uuid not null references users(id),
  amount_ksh numeric(12,2) not null,
  gift_send_id uuid references gift_sends(id),
  allocated_at timestamptz not null default now()
);

-- ---------- GIGS ----------
create table gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  university_id uuid not null references universities(id),
  title text not null,
  description text not null,
  scope text not null check (scope in ('school','country')),
  bid_limit int not null default 10 check (bid_limit > 0),
  private_contact text not null,
  private_links text,
  bid_count int not null default 0,
  status text not null default 'active' check (status in ('active','hidden','closed')),
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

create table gig_bids (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id) on delete cascade,
  bidder_id uuid not null references users(id),
  contact_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (gig_id, bidder_id)
);

-- ---------- HELP ----------
create table help_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  university_id uuid not null references universities(id),
  help_type text not null check (help_type in ('comments','money','food','notes','hostel','mental_health','other')),
  description text not null,
  proof_url text,
  wallet_code char(5),
  wallet_code_expires_at timestamptz,
  status text not null default 'active' check (status in ('active','closed','flagged')),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table help_confirmations (
  id uuid primary key default gen_random_uuid(),
  help_post_id uuid not null references help_posts(id) on delete cascade,
  sender_id uuid not null references users(id),
  gift_send_id uuid references gift_sends(id),
  confirmed_at timestamptz not null default now()
);

-- ---------- COUPLES ----------
create table couple_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  university_id uuid not null references universities(id),
  photo_url text not null,
  description text not null,
  poster_gender text not null check (poster_gender in ('male','female')),
  looking_for_gender text not null check (looking_for_gender in ('male','female')),
  target_scope text not null check (target_scope in ('country','county','school')),
  target_county_id int references counties(id),
  status text not null default 'active' check (status in ('active','matched','expired','closed')),
  matched_at timestamptz,
  expires_at timestamptz not null default (now() + interval '3 months'),
  created_at timestamptz not null default now()
);

create table couple_applications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references couple_posts(id) on delete cascade,
  applicant_id uuid not null references users(id),
  photo_url text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending','selected','rejected')),
  created_at timestamptz not null default now(),
  unique (post_id, applicant_id)
);

create table couple_matches (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references couple_posts(id),
  applicant_id uuid not null references users(id),
  matched_at timestamptz not null default now(),
  published_first_names text,
  published_at timestamptz,
  published_in_feed boolean not null default false
);

-- ---------- POSTS ----------
create table stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  university_id uuid not null references universities(id),
  body text not null,
  image_url text,
  is_event boolean not null default false,
  target_scope text not null check (target_scope in ('country','county','school')),
  target_county_id int references counties(id),
  expires_at timestamptz not null default (now() + interval '2 weeks'),
  status text not null default 'active' check (status in ('active','expired','flagged','deleted')),
  created_at timestamptz not null default now()
);

create table story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references users(id),
  type text not null check (type in ('like','love','support')),
  created_at timestamptz not null default now(),
  unique (story_id, user_id, type)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table anonymous_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  university_id uuid not null references universities(id),
  body text not null,
  target_scope text not null check (target_scope in ('country','county','school')),
  target_county_id int references counties(id),
  is_flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create table anonymous_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references anonymous_posts(id) on delete cascade,
  replier_id uuid not null references users(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- ADVICE ----------
create table advice_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  university_id uuid not null references universities(id),
  what_happened text not null,
  advice_needed text not null,
  created_at timestamptz not null default now()
);

create table advice_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references advice_posts(id) on delete cascade,
  user_id uuid not null references users(id),
  type text not null check (type in ('leave','talk_it_out','take_break','love')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- ---------- MODERATION ----------
create table reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('gig','help','couple','story','anonymous','advice','comment')),
  target_id uuid not null,
  reporter_id uuid not null references users(id),
  reason text not null,
  created_at timestamptz not null default now()
);

create table moderation_flags (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  report_count int not null default 0,
  flagged_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (target_type, target_id)
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  target_type text,
  target_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table deletion_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  category text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

-- ---------- SYSTEM ----------
create table system_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  university_id uuid not null references universities(id),
  body text not null,
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table legal_documents (
  id serial primary key,
  type text not null check (type in ('terms','privacy','rules')),
  version text not null,
  body text not null,
  effective_at timestamptz not null default now(),
  unique (type, version)
);

-- ---------- INDEXES ----------
create index idx_users_university on users(university_id);
create index idx_gigs_university on gigs(university_id);
create index idx_gigs_status on gigs(status);
create index idx_help_university on help_posts(university_id);
create index idx_couple_university on couple_posts(university_id);
create index idx_couple_scope on couple_posts(target_scope);
create index idx_stories_university on stories(university_id);
create index idx_stories_expires on stories(expires_at);
create index idx_anonymous_university on anonymous_posts(university_id);
create index idx_advice_university on advice_posts(university_id);
create index idx_reports_target on reports(target_type, target_id);
create index idx_system_messages_user on system_messages(user_id);