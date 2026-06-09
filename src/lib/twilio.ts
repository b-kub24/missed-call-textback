import twilio from "twilio";

// ---------------------------------------------------------------------------
// Twilio client singleton
// ---------------------------------------------------------------------------

let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

// ---------------------------------------------------------------------------
// Send an SMS via Twilio
// ---------------------------------------------------------------------------

export async function sendSms(params: {
  from: string;
  to: string;
  body: string;
}): Promise<{ sid: string; status: string }> {
  const client = getTwilioClient();

  const message = await client.messages.create({
    from: params.from,
    to: params.to,
    body: params.body,
  });

  return { sid: message.sid, status: message.status };
}

// ---------------------------------------------------------------------------
// Validate Twilio webhook signature (optional security layer)
// ---------------------------------------------------------------------------

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  return twilio.validateRequest(authToken, signature, url, params);
}
