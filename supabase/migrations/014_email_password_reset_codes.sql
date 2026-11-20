create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_codes_email_created
  on public.password_reset_codes(email, created_at desc);

alter table public.password_reset_codes enable row level security;
