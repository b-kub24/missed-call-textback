"use client";

import { useEffect, useState } from "react";
import StatsCards from "@/components/StatsCards";
import CallLog from "@/components/CallLog";
import SMSThread from "@/components/SMSThread";

interface DashboardData {
  stats: {
    missed_calls: number;
    sms_sent: number;
    replies: number;
    active_clients: number;
    response_rate: number;
    period_days: number;
  };
  recent_calls: Array<{
    id: string;
    client_id: string;
    caller_number: string;
    call_status: string | null;
    call_received_at: string;
    sms_sent_at: string | null;
    sms_template_used: string | null;
    sms_skipped_reason: string | null;
    inbound_replies_count: number;
  }>;
  recent_sms: Array<{
    id: string;
    client_id: string | null;
    direction: "outbound" | "inbound";
    from_number: string;
    to_number: string;
    body: string;
    status: string;
    created_at: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch dashboard data and client names in parallel
        const [dashRes, clientsRes] = await Promise.all([
          fetch(`/api/dashboard?days=${days}`),
          fetch("/api/clients?active=true"),
        ]);

        if (!dashRes.ok) throw new Error("Failed to load dashboard data");

        const dashData = await dashRes.json();
        setData(dashData);

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          const nameMap: Record<string, string> = {};
          for (const c of clientsData.clients || []) {
            nameMap[c.id] = c.business_name;
          }
          setClientNames(nameMap);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-800 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-red-600 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of missed calls and SMS activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Period:</label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {data && <StatsCards stats={data.stats} />}

      {/* Two columns: calls + SMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallLog
          calls={data?.recent_calls || []}
          clientNames={clientNames}
        />
        <SMSThread messages={data?.recent_sms || []} />
      </div>
    </div>
  );
}
