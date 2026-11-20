drop policy if exists "couples gender gated" on public.couple_posts;
create policy "couples gender gated" on public.couple_posts
for select using (
  is_admin()
  or (
    status = 'active'
    and expires_at > now()
    and poster_gender <> looking_for_gender
    and looking_for_gender = (select gender from public.users where id = auth.uid())
    and (
      target_scope = 'country'
      or (target_scope = 'county' and target_county_id = current_user_county())
      or (target_scope = 'school' and university_id = current_user_university())
    )
  )
);

drop policy if exists "user creates couple post" on public.couple_posts;
create policy "user creates couple post" on public.couple_posts
for insert with check (
  user_id = auth.uid()
  and university_id = current_user_university()
  and poster_gender = (select gender from public.users where id = auth.uid())
  and looking_for_gender <> poster_gender
  and (
    (target_scope = 'country' and target_county_id is null)
    or (target_scope = 'county' and target_county_id is not null)
    or (target_scope = 'school' and target_county_id is null)
  )
);

drop policy if exists "user updates own couple post" on public.couple_posts;
create policy "user updates own couple post" on public.couple_posts
for update using (user_id = auth.uid() or is_admin())
with check (
  is_admin()
  or (
    user_id = auth.uid()
    and university_id = current_user_university()
    and poster_gender = (select gender from public.users where id = auth.uid())
    and looking_for_gender <> poster_gender
    and (
      (target_scope = 'country' and target_county_id is null)
      or (target_scope = 'county' and target_county_id is not null)
      or (target_scope = 'school' and target_county_id is null)
    )
  )
);

drop policy if exists "user applies" on public.couple_applications;
create policy "user applies" on public.couple_applications
for insert with check (
  applicant_id = auth.uid()
  and exists (
    select 1 from public.couple_posts p
    where p.id = post_id
      and p.status = 'active'
      and p.expires_at > now()
      and p.user_id <> auth.uid()
      and p.poster_gender <> p.looking_for_gender
      and p.looking_for_gender = (select gender from public.users where id = auth.uid())
  )
);
