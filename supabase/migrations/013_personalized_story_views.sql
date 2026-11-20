create table if not exists public.story_views (
  user_id uuid not null references public.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

alter table public.story_views enable row level security;
drop policy if exists "users manage story views" on public.story_views;
create policy "users manage story views" on public.story_views
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
