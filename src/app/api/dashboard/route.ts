import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

/**
 * GET /api/dashboard
 *
 * Returns dashboard statistics and recent activity.
 * Optional query params:
 *   ?client_id=<uuid>  — filter by client
 *   ?days=<number>     — lookback window (default 30)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const days = parseInt(searchParams.get("days") || "30", 10);

    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    // --- Missed calls count ---
    let missedCallsQuery = supabase
      .from("missed_calls")
      .select("*", { count: "exact", head: false })
      .gte("call_received_at", since);

    if (clientId) missedCallsQuery = missedCallsQuery.eq("client_id", clientId);

    const { data: missedCalls, count: missedCallsCount, error: mcError } =
      await missedCallsQuery.order("call_received_at", { ascending: false }).limit(100);

    if (mcError) {
      console.error("[dashboard] missed_calls query error:", mcError);
    }

    // --- SMS sent count ---
    let smsSentQuery = supabase
      .from("sms_log")
      .select("*", { count: "exact", head: true })
      .eq("direction", "outbound")
      .gte("created_at", since);

    if (clientId) smsSentQuery = smsSentQuery.eq("client_id", clientId);

    const { count: smsSentCount, error: ssError } = await smsSentQuery;

    if (ssError) {
      console.error("[dashboard] sms_sent query error:", ssError);
    }

    // --- Inbound replies count ---
    let repliesQuery = supabase
      .from("sms_log")
      .select("*", { count: "exact", head: true })
      .eq("direction", "inbound")
      .gte("created_at", since);

    if (clientId) repliesQuery = repliesQuery.eq("client_id", clientId);

    const { count: repliesCount, error: rError } = await repliesQuery;

    if (rError) {
      console.error("[dashboard] replies query error:", rError);
    }

    // --- Active clients count ---
    const { count: activeClientsCount, error: acError } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    if (acError) {
      console.error("[dashboard] active_clients query error:", acError);
    }

    // --- Recent SMS log ---
    let smsLogQuery = supabase
      .from("sms_log")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);

    if (clientId) smsLogQuery = smsLogQuery.eq("client_id", clientId);

    const { data: recentSms, error: slError } = await smsLogQuery;

    if (slError) {
      console.error("[dashboard] sms_log query error:", slError);
    }

    // --- Response rate ---
    const responseRate =
      missedCallsCount && missedCallsCount > 0
        ? Math.round(((repliesCount || 0) / missedCallsCount) * 100)
        : 0;

    return NextResponse.json({
      stats: {
        missed_calls: missedCallsCount || 0,
        sms_sent: smsSentCount || 0,
        replies: repliesCount || 0,
        active_clients: activeClientsCount || 0,
        response_rate: responseRate,
        period_days: days,
      },
      recent_calls: missedCalls || [],
      recent_sms: recentSms || [],
    });
  } catch (error) {
    console.error("[dashboard] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
