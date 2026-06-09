import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  business_name: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string;
  twilio_number: string;
  sms_template: string;
  after_hours_template: string | null;
  booking_link: string | null;
  business_hours: BusinessHours;
  timezone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DaySchedule {
  open: string | null;
  close: string | null;
  closed: boolean;
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface MissedCall {
  id: string;
  client_id: string;
  caller_number: string;
  call_sid: string | null;
  call_status: string | null;
  call_received_at: string;
  sms_sent_at: string | null;
  sms_template_used: string | null;
  sms_skipped_reason: string | null;
  inbound_replies_count: number;
  created_at: string;
}

export interface SmsLogEntry {
  id: string;
  client_id: string | null;
  missed_call_id: string | null;
  direction: "outbound" | "inbound";
  from_number: string;
  to_number: string;
  body: string;
  twilio_sid: string | null;
  status: string;
  created_at: string;
}

export interface OptOut {
  id: string;
  phone_number: string;
  client_id: string | null;
  opted_out_at: string;
}

// ---------------------------------------------------------------------------
// Client-side Supabase client (uses anon key, respects RLS)
// ---------------------------------------------------------------------------

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}

// ---------------------------------------------------------------------------
// Server-side Supabase client (uses service role key, bypasses RLS)
// Used in API routes and webhooks.
// ---------------------------------------------------------------------------

export function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
