"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import CallLog from "@/components/CallLog";
import SMSThread from "@/components/SMSThread";

interface ClientData {
  id: string;
  business_name: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string;
  twilio_number: string;
  sms_template: string;
  after_hours_template: string | null;
  booking_link: string | null;
  business_hours: Record<string, { open: string | null; close: string | null; closed: boolean }>;
  timezone: string;
  active: boolean;
  created_at: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientData | null>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [smsLog, setSmsLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "calls" | "sms">(
    "settings"
  );

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch client details
        const clientRes = await fetch("/api/clients");
        if (!clientRes.ok) throw new Error("Failed to load client");
        const clientData = await clientRes.json();
        const found = (clientData.clients || []).find(
          (c: ClientData) => c.id === clientId
        );
        if (!found) throw new Error("Client not found");
        setClient(found);

        // Fetch dashboard data filtered by client
        const dashRes = await fetch(
          `/api/dashboard?client_id=${clientId}&days=90`
        );
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setCalls(dashData.recent_calls || []);
          setSmsLog(dashData.recent_sms || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-800 font-medium">{error || "Client not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {client.business_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Client detail and configuration
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            client.active
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {client.active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {(
            [
              { key: "settings", label: "Settings" },
              { key: "calls", label: `Missed Calls (${calls.length})` },
              { key: "sms", label: `SMS Log (${smsLog.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "settings" && (
        <ClientForm
          mode="edit"
          clientId={client.id}
          initialData={{
            business_name: client.business_name,
            owner_name: client.owner_name || "",
            owner_email: client.owner_email || "",
            owner_phone: client.owner_phone,
            twilio_number: client.twilio_number,
            sms_template: client.sms_template,
            after_hours_template: client.after_hours_template || "",
            booking_link: client.booking_link || "",
            timezone: client.timezone,
            business_hours: client.business_hours,
          }}
        />
      )}

      {activeTab === "calls" && <CallLog calls={calls} />}

      {activeTab === "sms" && (
        <SMSThread
          messages={smsLog}
          clientTwilioNumber={client.twilio_number}
        />
      )}
    </div>
  );
}
