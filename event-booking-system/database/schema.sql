-- Run once in Supabase SQL Editor. Backend uses service_role; NEVER put it in the browser.
create extension if not exists pgcrypto;
create table if not exists public.events (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 120),
 description text not null check(length(trim(description)) between 1 and 1000),
 category text not null check(length(trim(category)) between 1 and 120),
 location text not null check(length(trim(location)) between 1 and 120),
 event_date timestamptz not null,
 capacity integer not null check(capacity between 1 and 10000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.bookings (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 attendee_name text not null check(length(trim(attendee_name)) between 1 and 120),
 attendee_email text not null check(length(attendee_email) between 3 and 254),
 created_at timestamptz not null default now(),
 unique(event_id,attendee_email)
);
create index if not exists events_date_idx on public.events(event_date);
create index if not exists bookings_event_idx on public.bookings(event_id);
create index if not exists bookings_email_idx on public.bookings(attendee_email);
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now();return new;end;$$;
drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
-- Atomic capacity check with a row lock, preventing overbooking under concurrency.
create or replace function public.reserve_event(p_event_id uuid,p_name text,p_email text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_capacity int;v_count int;v_id uuid;
begin
 select capacity into v_capacity from public.events where id=p_event_id for update;
 if not found then raise exception 'EVENT_NOT_FOUND';end if;
 if exists(select 1 from public.bookings where event_id=p_event_id and attendee_email=p_email) then raise exception 'ALREADY_BOOKED';end if;
 select count(*) into v_count from public.bookings where event_id=p_event_id;
 if v_count>=v_capacity then raise exception 'EVENT_FULL';end if;
 insert into public.bookings(event_id,attendee_name,attendee_email) values(p_event_id,p_name,p_email) returning id into v_id;
 return v_id;
end;$$;
alter table public.events enable row level security;
alter table public.bookings enable row level security;
-- No anon/authenticated policies: only trusted server-side service_role bypasses RLS.
revoke all on public.events,public.bookings from anon,authenticated;
revoke execute on function public.reserve_event(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_event(uuid,text,text) to service_role;
