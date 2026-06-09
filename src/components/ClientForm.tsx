"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BusinessHoursDay {
  open: string | null;
  close: string | null;
  closed: boolean;
}

interface ClientFormData {
  business_name: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  twilio_number: string;
  sms_template: string;
  after_hours_template: string;
  booking_link: string;
  timezone: string;
  business_hours: Record<string, BusinessHoursDay>;
}

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  clientId?: string;
  mode: "create" | "edit";
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const DEFAULT_HOURS: Record<string, BusinessHoursDay> = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "10:00", close: "14:00", closed: false },
  sunday: { open: null, close: null, closed: true },
};

const DEFAULT_SMS =
  "Hi! Sorry we missed your call at {{business_name}}. How can we help? Reply here or book an appointment: {{booking_link}}";
const DEFAULT_AFTER_HOURS =
  "Hi! You reached {{business_name}} after hours. We'll get back to you first thing tomorrow! In the meantime, you can book online: {{booking_link}}";

export default function ClientForm({
  initialData,
  clientId,
  mode,
}: ClientFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<ClientFormData>({
    business_name: initialData?.business_name || "",
    owner_name: initialData?.owner_name || "",
    owner_email: initialData?.owner_email || "",
    owner_phone: initialData?.owner_phone || "",
    twilio_number: initialData?.twilio_number || "",
    sms_template: initialData?.sms_template || DEFAULT_SMS,
    after_hours_template:
      initialData?.after_hours_template || DEFAULT_AFTER_HOURS,
    booking_link: initialData?.booking_link || "",
    timezone: initialData?.timezone || "America/New_York",
    business_hours: initialData?.business_hours || DEFAULT_HOURS,
  });

  function updateField(field: keyof ClientFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateHours(
    day: string,
    field: keyof BusinessHoursDay,
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value,
        },
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const url =
        mode === "create" ? "/api/clients" : `/api/clients?id=${clientId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save client");
      }

      setSuccess(true);

      if (mode === "create") {
        // Redirect to the new client detail page after a brief delay
        setTimeout(() => {
          router.push(`/dashboard/clients/${data.client.id}`);
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Success banner */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-green-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-green-800 font-medium">
            {mode === "create"
              ? "Client created successfully! Redirecting..."
              : "Changes saved successfully!"}
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Business Info */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name *
            </label>
            <input
              type="text"
              required
              value={form.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="Acme Plumbing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking Link
            </label>
            <input
              type="url"
              value={form.booking_link}
              onChange={(e) => updateField("booking_link", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="https://calendly.com/your-business"
            />
          </div>
        </div>
      </section>

      {/* Owner Info */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Owner / Contact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.owner_name}
              onChange={(e) => updateField("owner_name", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={form.owner_phone}
              onChange={(e) => updateField("owner_phone", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="+15551234567"
            />
            <p className="text-xs text-gray-500 mt-1">
              Replies will be forwarded here
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.owner_email}
              onChange={(e) => updateField("owner_email", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="john@acmeplumbing.com"
            />
          </div>
        </div>
      </section>

      {/* Twilio */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Twilio Configuration
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Twilio Phone Number *
          </label>
          <input
            type="tel"
            required
            value={form.twilio_number}
            onChange={(e) => updateField("twilio_number", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none max-w-md"
            placeholder="+15559876543"
          />
          <p className="text-xs text-gray-500 mt-1">
            The Twilio number provisioned for this client. Calls to this number
            will be monitored.
          </p>
        </div>
      </section>

      {/* SMS Templates */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          SMS Templates
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Available variables:{" "}
          <code className="bg-gray-100 px-1 rounded">{"{{business_name}}"}</code>
          ,{" "}
          <code className="bg-gray-100 px-1 rounded">{"{{booking_link}}"}</code>
          ,{" "}
          <code className="bg-gray-100 px-1 rounded">{"{{owner_name}}"}</code>
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Standard Template (during business hours)
            </label>
            <textarea
              rows={3}
              value={form.sms_template}
              onChange={(e) => updateField("sms_template", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              After Hours Template
            </label>
            <textarea
              rows={3}
              value={form.after_hours_template}
              onChange={(e) =>
                updateField("after_hours_template", e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>
        </div>
      </section>

      {/* Business Hours */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Business Hours
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          After-hours template will be used outside these hours.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Timezone
          </label>
          <select
            value={form.timezone}
            onChange={(e) => updateField("timezone", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const schedule = form.business_hours[day] || {
              open: "09:00",
              close: "17:00",
              closed: false,
            };
            return (
              <div
                key={day}
                className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="w-28">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {day}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!schedule.closed}
                    onChange={(e) =>
                      updateHours(day, "closed", !e.target.checked)
                    }
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </label>
                {!schedule.closed && (
                  <>
                    <input
                      type="time"
                      value={schedule.open || "09:00"}
                      onChange={(e) =>
                        updateHours(day, "open", e.target.value)
                      }
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500 text-sm">to</span>
                    <input
                      type="time"
                      value={schedule.close || "17:00"}
                      onChange={(e) =>
                        updateHours(day, "close", e.target.value)
                      }
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    />
                  </>
                )}
                {schedule.closed && (
                  <span className="text-sm text-gray-400 italic">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? "Saving..."
            : mode === "create"
            ? "Create Client"
            : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
