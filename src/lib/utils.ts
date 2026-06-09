import { BusinessHours, Client } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

/**
 * Replace {{variable}} placeholders in an SMS template with actual values.
 */
export function renderTemplate(
  template: string,
  client: Client,
  extras: Record<string, string> = {}
): string {
  const vars: Record<string, string> = {
    business_name: client.business_name,
    booking_link: client.booking_link || "",
    owner_name: client.owner_name || "",
    owner_phone: client.owner_phone,
    ...extras,
  };

  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Business hours check
// ---------------------------------------------------------------------------

const DAY_NAMES: Record<number, keyof BusinessHours> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

/**
 * Determine whether the current moment falls within a client's business hours.
 * Uses the client's configured timezone.
 */
export function isWithinBusinessHours(client: Client): boolean {
  const tz = client.timezone || "America/New_York";
  const now = new Date();

  // Get the current time in the client's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long",
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase();
  const hour = parts.find((p) => p.type === "hour")?.value || "0";
  const minute = parts.find((p) => p.type === "minute")?.value || "0";

  if (!weekday) return true; // default to business hours if we can't determine

  const dayKey = (Object.values(DAY_NAMES).find((d) => d === weekday) ||
    "monday") as keyof BusinessHours;
  const schedule = client.business_hours?.[dayKey];

  if (!schedule || schedule.closed) return false;
  if (!schedule.open || !schedule.close) return false;

  const currentMinutes = parseInt(hour) * 60 + parseInt(minute);
  const [openH, openM] = schedule.open.split(":").map(Number);
  const [closeH, closeM] = schedule.close.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Pick the correct SMS template based on business hours.
 */
export function pickTemplate(client: Client): {
  template: string;
  type: "standard" | "after_hours";
} {
  if (isWithinBusinessHours(client)) {
    return { template: client.sms_template, type: "standard" };
  }
  return {
    template: client.after_hours_template || client.sms_template,
    type: "after_hours",
  };
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Check if we've already sent an SMS to this caller within the dedup window.
 * Returns true if a duplicate exists (i.e., we should SKIP sending).
 */
export async function isDuplicateCall(
  supabase: SupabaseClient,
  clientId: string,
  callerNumber: string,
  windowMinutes: number = 5
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - windowMinutes * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("missed_calls")
    .select("id")
    .eq("client_id", clientId)
    .eq("caller_number", callerNumber)
    .gte("call_received_at", windowStart)
    .not("sms_sent_at", "is", null)
    .limit(1);

  if (error) {
    console.error("Dedup check failed:", error);
    return false; // fail open — send the SMS
  }

  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Opt-out check
// ---------------------------------------------------------------------------

/**
 * Check if a phone number has opted out for a given client.
 */
export async function isOptedOut(
  supabase: SupabaseClient,
  phoneNumber: string,
  clientId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("opt_outs")
    .select("id")
    .eq("phone_number", phoneNumber)
    .eq("client_id", clientId)
    .limit(1);

  if (error) {
    console.error("Opt-out check failed:", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Phone number formatting
// ---------------------------------------------------------------------------

/**
 * Normalize a phone number to E.164 format.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7);
    return `(${area}) ${prefix}-${line}`;
  }
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6);
    return `(${area}) ${prefix}-${line}`;
  }
  return phone;
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}
