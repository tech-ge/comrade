alter table public.users
  add column if not exists username text,
  add column if not exists deleted_at timestamptz;

alter table public.users
  drop constraint if exists users_username_format;
alter table public.users
  add constraint users_username_format
  check (username is null or username ~ '^[A-Za-z0-9_]{3,24}$');

create unique index if not exists users_username_unique_ci
  on public.users (lower(username))
  where username is not null;
