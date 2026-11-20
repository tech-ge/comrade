alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;

alter table public.advice_posts
  add column if not exists image_url text;

alter table public.story_reactions
  drop constraint if exists story_reactions_type_check;
alter table public.story_reactions
  add constraint story_reactions_type_check
  check (type in ('like','love','dislike','laugh','sad','angry','support'));

create index if not exists idx_comments_parent on public.comments(parent_comment_id);
