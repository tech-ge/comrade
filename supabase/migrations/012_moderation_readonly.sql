alter table public.users add column if not exists read_only boolean not null default false;
alter table public.comments add column if not exists image_url text;

create or replace function public.flag_content_and_limit_author() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
  v_author_report_count integer;
  v_author uuid;
begin
  select count(*) into v_count from public.reports
    where target_type = new.target_type and target_id = new.target_id;
  insert into public.moderation_flags(target_type, target_id, report_count)
    values (new.target_type, new.target_id, v_count)
    on conflict (target_type, target_id) do update set report_count = excluded.report_count, flagged_at = now();

  case new.target_type
    when 'story' then select user_id into v_author from public.stories where id = new.target_id;
    when 'help' then select user_id into v_author from public.help_posts where id = new.target_id;
    when 'advice' then select user_id into v_author from public.advice_posts where id = new.target_id;
    when 'gig' then select user_id into v_author from public.gigs where id = new.target_id;
    when 'couple' then select user_id into v_author from public.couple_posts where id = new.target_id;
    when 'anonymous' then select user_id into v_author from public.anonymous_posts where id = new.target_id;
    when 'comment' then select user_id into v_author from public.comments where id = new.target_id;
  end case;
  if v_author is not null then
    select count(*) into v_author_report_count from public.reports r where
      (r.target_type = 'story' and exists (select 1 from public.stories x where x.id = r.target_id and x.user_id = v_author)) or
      (r.target_type = 'help' and exists (select 1 from public.help_posts x where x.id = r.target_id and x.user_id = v_author)) or
      (r.target_type = 'advice' and exists (select 1 from public.advice_posts x where x.id = r.target_id and x.user_id = v_author)) or
      (r.target_type = 'gig' and exists (select 1 from public.gigs x where x.id = r.target_id and x.user_id = v_author)) or
      (r.target_type = 'couple' and exists (select 1 from public.couple_posts x where x.id = r.target_id and x.user_id = v_author)) or
      (r.target_type = 'anonymous' and exists (select 1 from public.anonymous_posts x where x.id = r.target_id and x.user_id = v_author)) or
      (r.target_type = 'comment' and exists (select 1 from public.comments x where x.id = r.target_id and x.user_id = v_author));
  end if;
  if v_author_report_count >= 4 and v_author is not null then
    update public.users set read_only = true, suspension_reason = 'Read-only while community reports are reviewed' where id = v_author;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_report_threshold on public.reports;
create trigger trg_report_threshold after insert on public.reports
for each row execute function public.flag_content_and_limit_author();
