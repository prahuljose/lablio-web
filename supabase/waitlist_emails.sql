create table if not exists public.waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'coming_soon_page',
  status text not null default 'joined',
  ref text,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table public.waitlist_emails enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'waitlist_emails_status_check'
      and conrelid = 'public.waitlist_emails'::regclass
  ) then
    alter table public.waitlist_emails
      add constraint waitlist_emails_status_check
      check (status in ('joined', 'invited', 'converted', 'bounced'));
  end if;
end $$;

create index if not exists waitlist_emails_created_at_idx
  on public.waitlist_emails (created_at desc);

create index if not exists waitlist_emails_status_idx
  on public.waitlist_emails (status);

create index if not exists waitlist_emails_ref_idx
  on public.waitlist_emails (ref);

drop policy if exists "Anyone can join waitlist" on public.waitlist_emails;

create policy "Anyone can join waitlist"
on public.waitlist_emails
for insert
to anon
with check (
  source = 'coming_soon_page'
  and status = 'joined'
  and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);
