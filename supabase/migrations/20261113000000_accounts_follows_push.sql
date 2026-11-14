create table public.follows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  team_key text not null check (team_key ~ '^(basketball|soccer|volleyball):[0-9]+$'),
  created_at timestamptz not null default now(),
  primary key (user_id, team_key)
);

alter table public.follows enable row level security;

create policy "read own follows" on public.follows
  for select to authenticated using (user_id = (select auth.uid()));

create policy "add own follows" on public.follows
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "remove own follows" on public.follows
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'web')),
  created_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "read own push tokens" on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));

create policy "add own push tokens" on public.push_tokens
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "remove own push tokens" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

create function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
