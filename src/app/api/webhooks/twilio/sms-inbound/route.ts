import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";
import { normalizePhone } from "@/lib/utils";
import type { Client } from "@/lib/supabase";

// Standard opt-out keywords per CTIA guidelines
const OPT_OUT_KEYWORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"];
const OPT_IN_KEYWORDS = ["start", "yes", "unstop"];

/**
 * POST /api/webhooks/twilio/sms-inbound
 *
 * Handles incoming SMS replies from callers.
 * - If the message is "STOP", mark as opted out.
 * - Otherwise, forward the message to the business owner's phone.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value: FormDataEntryValue, key: string) => {
      params[key] = value.toString();
    });

    const messageSid = params.MessageSid || "";
    const fromNumber = normalizePhone(params.From || "");
    const toNumber = normalizePhone(params.To || "");
    const body = (params.Body || "").trim();

    console.log(
      `[sms-inbound] SID=${messageSid} From=${fromNumber} To=${toNumber} Body="${body}"`
    );

    const supabase = getSupabaseServiceClient();

    // Find the client by the Twilio number that received the SMS
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("twilio_number", toNumber)
      .eq("active", true)
      .single();

    if (clientError || !client) {
      console.error(
        `[sms-inbound] No active client for number ${toNumber}:`,
        clientError
      );
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    const typedClient = client as Client;

    // Handle opt-out keywords
    const normalizedBody = body.toLowerCase().trim();
    if (OPT_OUT_KEYWORDS.includes(normalizedBody)) {
      console.log(`[sms-inbound] Opt-out from ${fromNumber}`);

      // Record the opt-out
      await supabase
        .from("opt_outs")
        .upsert(
          {
            phone_number: fromNumber,
            client_id: typedClient.id,
            opted_out_at: new Date().toISOString(),
          },
          { onConflict: "phone_number,client_id" }
        );

      // Log the inbound message
      await supabase.from("sms_log").insert({
        client_id: typedClient.id,
        direction: "inbound",
        from_number: fromNumber,
        to_number: toNumber,
        body: body,
        twilio_sid: messageSid,
        status: "opt_out",
      });

      // Twilio handles STOP automatically, but we confirm
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been unsubscribed and will not receive further messages.</Message></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Handle opt-in keywords
    if (OPT_IN_KEYWORDS.includes(normalizedBody)) {
      console.log(`[sms-inbound] Opt-in from ${fromNumber}`);

      await supabase
        .from("opt_outs")
        .delete()
        .eq("phone_number", fromNumber)
        .eq("client_id", typedClient.id);

      await supabase.from("sms_log").insert({
        client_id: typedClient.id,
        direction: "inbound",
        from_number: fromNumber,
        to_number: toNumber,
        body: body,
        twilio_sid: messageSid,
        status: "opt_in",
      });

      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been resubscribed. Reply STOP at any time to opt out.</Message></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Log the inbound message
    // Find the most recent missed call from this number to link it
    const { data: recentCall } = await supabase
      .from("missed_calls")
      .select("id")
      .eq("client_id", typedClient.id)
      .eq("caller_number", fromNumber)
      .order("call_received_at", { ascending: false })
      .limit(1)
      .single();

    await supabase.from("sms_log").insert({
      client_id: typedClient.id,
      missed_call_id: recentCall?.id || null,
      direction: "inbound",
      from_number: fromNumber,
      to_number: toNumber,
      body: body,
      twilio_sid: messageSid,
      status: "received",
    });

    // Increment reply count on the missed call
    if (recentCall?.id) {
      await supabase.rpc("increment_reply_count", {
        call_id: recentCall.id,
      }).then(({ error }) => {
        // If the RPC doesn't exist, do a manual update
        if (error) {
          supabase
            .from("missed_calls")
            .update({
              inbound_replies_count: (recentCall as any).inbound_replies_count
                ? (recentCall as any).inbound_replies_count + 1
                : 1,
            })
            .eq("id", recentCall.id)
            .then(() => {});
        }
      });
    }

    // Forward the message to the business owner
    const forwardBody = `[InstantReply] New reply from ${fromNumber}:\n\n"${body}"\n\nReply to this message to respond.`;

    console.log(
      `[sms-inbound] Forwarding to owner ${typedClient.owner_phone}`
    );

    const { sid: forwardSid } = await sendSms({
      from: typedClient.twilio_number,
      to: typedClient.owner_phone,
      body: forwardBody,
    });

    // Log the forwarded message
    await supabase.from("sms_log").insert({
      client_id: typedClient.id,
      missed_call_id: recentCall?.id || null,
      direction: "outbound",
      from_number: typedClient.twilio_number,
      to_number: typedClient.owner_phone,
      body: forwardBody,
      twilio_sid: forwardSid,
      status: "forwarded",
    });

    console.log(`[sms-inbound] Forwarded. SID=${forwardSid}`);

    // Return empty TwiML (no auto-reply to the caller beyond the initial one)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("[sms-inbound] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
