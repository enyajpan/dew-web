-- Accounts: one profile row per Supabase Auth user. The app keeps the user's
-- skin profile, shelf ratings, points, cart and check-ins in app_state.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  app_state   jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create the profile row when someone signs up (first name comes from sign-up metadata).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name) values (new.id, new.raw_user_meta_data ->> 'first_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- AI summaries of each product's reviews: what people liked and didn't.
create table public.review_summaries (
  product_id    text primary key references public.products(id) on delete cascade,
  summary       text not null,
  pros          jsonb not null default '[]',  -- [{ "point": "...", "mentions": "many" }]
  cons          jsonb not null default '[]',
  review_count  integer not null,             -- reviews the summary was based on
  model         text not null,
  generated_at  timestamptz not null default now()
);

alter table public.review_summaries enable row level security;
create policy "public read" on public.review_summaries for select using (true);
