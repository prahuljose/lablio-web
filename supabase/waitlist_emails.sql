create table if not exists public.waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'coming_soon_page',
  created_at timestamptz not null default now()
);

alter table public.waitlist_emails enable row level security;

drop policy if exists "Anyone can join waitlist" on public.waitlist_emails;

create policy "Anyone can join waitlist"
on public.waitlist_emails
for insert
to anon
with check (
  source = 'coming_soon_page'
  and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);
