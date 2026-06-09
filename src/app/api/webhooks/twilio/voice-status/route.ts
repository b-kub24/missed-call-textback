import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";
import {
  isDuplicateCall,
  isOptedOut,
  pickTemplate,
  renderTemplate,
  normalizePhone,
} from "@/lib/utils";
import type { Client } from "@/lib/supabase";

/**
 * POST /api/webhooks/twilio/voice-status
 *
 * Twilio calls this webhook when a call's status changes.
 * We care about: no-answer, busy, failed, canceled — these are missed calls.
 *
 * Twilio sends form-encoded data with fields like:
 *   CallSid, CallStatus, To, From, Direction, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value: FormDataEntryValue, key: string) => {
      params[key] = value.toString();
    });

    const callSid = params.CallSid || "";
    const callStatus = params.CallStatus || "";
    const toNumber = normalizePhone(params.To || "");
    const fromNumber = normalizePhone(params.From || "");

    console.log(
      `[voice-status] CallSid=${callSid} Status=${callStatus} From=${fromNumber} To=${toNumber}`
    );

    // Only act on missed call statuses
    const missedStatuses = ["no-answer", "busy", "failed", "canceled"];
    if (!missedStatuses.includes(callStatus)) {
      console.log(`[voice-status] Ignoring status: ${callStatus}`);
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Find the client by the Twilio number that was called
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("twilio_number", toNumber)
      .eq("active", true)
      .single();

    if (clientError || !client) {
      console.error(
        `[voice-status] No active client found for number ${toNumber}:`,
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

    // Insert the missed call record
    const { data: missedCall, error: insertError } = await supabase
      .from("missed_calls")
      .insert({
        client_id: typedClient.id,
        caller_number: fromNumber,
        call_sid: callSid,
        call_status: callStatus,
        call_received_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[voice-status] Failed to insert missed_call:", insertError);
      return NextResponse.json(
        { error: "Failed to record missed call" },
        { status: 500 }
      );
    }

    // Check for opt-out
    const optedOut = await isOptedOut(supabase, fromNumber, typedClient.id);
    if (optedOut) {
      console.log(`[voice-status] Caller ${fromNumber} has opted out — skipping SMS`);
      await supabase
        .from("missed_calls")
        .update({ sms_skipped_reason: "opted_out" })
        .eq("id", missedCall.id);

      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Check for duplicate calls (dedup within 5 minutes)
    const isDupe = await isDuplicateCall(
      supabase,
      typedClient.id,
      fromNumber,
      5
    );
    if (isDupe) {
      console.log(
        `[voice-status] Duplicate call from ${fromNumber} within 5min — skipping SMS`
      );
      await supabase
        .from("missed_calls")
        .update({ sms_skipped_reason: "duplicate" })
        .eq("id", missedCall.id);

      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Pick template based on business hours
    const { template, type: templateType } = pickTemplate(typedClient);
    const smsBody = renderTemplate(template, typedClient);

    // Send SMS via Twilio
    console.log(
      `[voice-status] Sending ${templateType} SMS from ${typedClient.twilio_number} to ${fromNumber}`
    );

    const { sid: twilioSid } = await sendSms({
      from: typedClient.twilio_number,
      to: fromNumber,
      body: smsBody,
    });

    // Update missed call record with SMS info
    await supabase
      .from("missed_calls")
      .update({
        sms_sent_at: new Date().toISOString(),
        sms_template_used: templateType,
      })
      .eq("id", missedCall.id);

    // Log the outbound SMS
    await supabase.from("sms_log").insert({
      client_id: typedClient.id,
      missed_call_id: missedCall.id,
      direction: "outbound",
      from_number: typedClient.twilio_number,
      to_number: fromNumber,
      body: smsBody,
      twilio_sid: twilioSid,
      status: "sent",
    });

    console.log(
      `[voice-status] SMS sent successfully. SID=${twilioSid}`
    );

    // Return TwiML empty response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("[voice-status] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
