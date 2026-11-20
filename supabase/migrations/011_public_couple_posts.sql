create table if not exists public.couple_post_views (
  post_id uuid not null references public.couple_posts(id) on delete cascade,
  viewer_id uuid not null references public.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (post_id, viewer_id)
);

create unique index if not exists couple_post_views_post_viewer_key on public.couple_post_views(post_id, viewer_id);

alter table public.couple_post_views enable row level security;
drop policy if exists "couple views manage" on public.couple_post_views;
drop policy if exists "viewer records couple post view" on public.couple_post_views;
drop policy if exists "post owner sees couple post views" on public.couple_post_views;
drop policy if exists "couples gender gated" on public.couple_posts;
create policy "public active couple posts" on public.couple_posts
  for select using (auth.uid() is not null and (status = 'active' or user_id = auth.uid() or is_admin()));

drop policy if exists "user creates couple post" on public.couple_posts;
create policy "user creates couple post" on public.couple_posts
  for insert with check (user_id = auth.uid());

drop policy if exists "user applies" on public.couple_applications;
create policy "user applies" on public.couple_applications
  for insert with check (
    applicant_id = auth.uid()
    and exists (select 1 from public.couple_posts p where p.id = post_id and p.status = 'active' and p.expires_at > now() and p.user_id <> auth.uid())
  );

drop policy if exists "couple views visible to parties" on public.couple_post_views;

drop policy if exists "viewer records couple post view" on public.couple_post_views;
create policy "viewer records couple post view" on public.couple_post_views
  for insert with check (viewer_id = auth.uid() and exists (select 1 from public.couple_posts p where p.id = post_id and p.status = 'active'));
create policy "post owner sees couple post views" on public.couple_post_views
  for select using (exists (select 1 from public.couple_posts p where p.id = post_id and p.user_id = auth.uid()) or is_admin());
