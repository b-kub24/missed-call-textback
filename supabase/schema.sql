-- =============================================================================
-- InstantReply — Supabase Schema Migration
-- =============================================================================
-- Run this in the Supabase SQL Editor to set up the database.

-- Enable required extensions
create extension if not exists "pgcrypto";

-- =============================================================================
-- TABLES
-- =============================================================================

-- Clients: each SMB that uses the service
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text,
  owner_email text,
  owner_phone text not null,
  twilio_number text not null,
  sms_template text not null default 'Hi! Sorry we missed your call at {{business_name}}. How can we help? Reply here or book an appointment: {{booking_link}}',
  after_hours_template text default 'Hi! You reached {{business_name}} after hours. We''ll get back to you first thing tomorrow! In the meantime, you can book online: {{booking_link}}',
  booking_link text,
  business_hours jsonb default '{
    "monday":    {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday":   {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday":  {"open": "09:00", "close": "17:00", "closed": false},
    "friday":    {"open": "09:00", "close": "17:00", "closed": false},
    "saturday":  {"open": "10:00", "close": "14:00", "closed": false},
    "sunday":    {"open": null, "close": null, "closed": true}
  }'::jsonb,
  timezone text default 'America/New_York',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Missed calls log
create table if not exists public.missed_calls (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  caller_number text not null,
  call_sid text,
  call_status text,
  call_received_at timestamptz default now(),
  sms_sent_at timestamptz,
  sms_template_used text,
  sms_skipped_reason text,
  inbound_replies_count int default 0,
  created_at timestamptz default now()
);

-- SMS log (both outbound auto-replies and inbound replies)
create table if not exists public.sms_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  missed_call_id uuid references public.missed_calls(id) on delete set null,
  direction text not null check (direction in ('outbound', 'inbound')),
  from_number text not null,
  to_number text not null,
  body text not null,
  twilio_sid text,
  status text default 'sent',
  created_at timestamptz default now()
);

-- Opt-outs: callers who have texted STOP
create table if not exists public.opt_outs (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  client_id uuid references public.clients(id) on delete cascade,
  opted_out_at timestamptz default now(),
  unique(phone_number, client_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_missed_calls_client_id on public.missed_calls(client_id);
create index if not exists idx_missed_calls_caller_number on public.missed_calls(caller_number);
create index if not exists idx_missed_calls_received_at on public.missed_calls(call_received_at desc);
create index if not exists idx_sms_log_client_id on public.sms_log(client_id);
create index if not exists idx_sms_log_missed_call_id on public.sms_log(missed_call_id);
create index if not exists idx_sms_log_created_at on public.sms_log(created_at desc);
create index if not exists idx_opt_outs_phone on public.opt_outs(phone_number);
create index if not exists idx_clients_twilio_number on public.clients(twilio_number);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_clients_updated
  before update on public.clients
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
alter table public.clients enable row level security;
alter table public.missed_calls enable row level security;
alter table public.sms_log enable row level security;
alter table public.opt_outs enable row level security;

-- Service role (used by API routes via SUPABASE_SERVICE_ROLE_KEY) bypasses RLS.
-- These policies allow authenticated dashboard users to read data.

-- Clients: authenticated users can read all clients, insert/update
create policy "Authenticated users can read clients"
  on public.clients for select
  to authenticated
  using (true);

create policy "Authenticated users can insert clients"
  on public.clients for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update clients"
  on public.clients for update
  to authenticated
  using (true)
  with check (true);

-- Missed calls: authenticated users can read
create policy "Authenticated users can read missed_calls"
  on public.missed_calls for select
  to authenticated
  using (true);

-- SMS log: authenticated users can read
create policy "Authenticated users can read sms_log"
  on public.sms_log for select
  to authenticated
  using (true);

-- Opt-outs: authenticated users can read
create policy "Authenticated users can read opt_outs"
  on public.opt_outs for select
  to authenticated
  using (true);

-- Allow service role full access (webhooks run server-side with service role key)
-- Note: service_role bypasses RLS by default in Supabase, so no explicit
-- policies are needed for it. The policies above are for the dashboard UI
-- which uses the anon/authenticated role.

-- =============================================================================
-- SEED DATA (optional — remove for production)
-- =============================================================================

-- Uncomment below to insert a test client:
-- insert into public.clients (business_name, owner_name, owner_phone, twilio_number, booking_link)
-- values (
--   'Acme Plumbing',
--   'John Smith',
--   '+15551234567',
--   '+15559876543',
--   'https://calendly.com/acme-plumbing'
-- );
