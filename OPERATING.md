# InstantReply — Operating Guide

Day-to-day operations manual for the Missed-Call Text-Back system.

---

## Onboarding a New Client

### Step 1: Provision a Twilio number

1. Log in to [Twilio Console](https://console.twilio.com).
2. Go to **Phone Numbers > Buy a Number**.
3. Choose a local number in the client's area code (improves SMS deliverability).
4. Ensure it has both **Voice** and **SMS** capabilities.
5. Purchase the number and note it down.

### Step 2: Configure webhooks on the number

1. Click on the newly purchased number.
2. Set **Voice webhook** to: `https://YOUR_APP_URL/api/webhooks/twilio/voice-status` (POST)
3. Set **Voice status callback** to the same URL.
4. Set **SMS webhook** to: `https://YOUR_APP_URL/api/webhooks/twilio/sms-inbound` (POST)
5. Configure a TwiML Bin to ring the owner's phone (see SETUP.md Step 2.4).
6. Save.

### Step 3: Create the client in the dashboard

1. Go to `https://YOUR_APP_URL/onboard`.
2. Fill in:
   - **Business Name** — The client's business name (used in SMS templates)
   - **Owner Phone** — Where replies get forwarded
   - **Twilio Number** — The number you just provisioned (E.164 format: +1XXXXXXXXXX)
   - **Booking Link** — Their Calendly, Square, or other booking URL
   - **SMS Templates** — Customize or use defaults
   - **Business Hours** — Set their operating hours and timezone
3. Submit the form.
4. Verify the client appears in `/dashboard/clients`.

### Step 4: Test the flow

1. Call the Twilio number from a test phone.
2. Let it ring out (do not answer).
3. Confirm an SMS arrives on the test phone within ~5 seconds.
4. Reply to the SMS.
5. Confirm the reply is forwarded to the owner's phone.
6. Check the dashboard for the logged call and SMS.

---

## Day-to-Day Monitoring

### Dashboard Overview

Visit `/dashboard` to see:

- **Missed Calls** — Total count in the selected period
- **SMS Sent** — Number of auto-reply texts sent
- **Replies** — Number of inbound replies from callers
- **Active Clients** — Total enrolled businesses
- **Response Rate** — Percentage of missed calls that resulted in a reply

### Reviewing Activity

- **Recent Missed Calls table** shows each missed call with:
  - Caller number
  - Business it was for
  - Whether SMS was sent, deduplicated, or skipped (opt-out)
  - Number of replies
- **SMS Activity panel** shows a chronological feed of all messages

### Per-Client View

Click any client in `/dashboard/clients` to see:
- Their settings (editable)
- Their missed calls
- Their SMS log

---

## Managing Clients

### Editing a client

1. Go to `/dashboard/clients`.
2. Click the client name or "View / Edit".
3. Update any fields (templates, hours, booking link, etc.).
4. Click "Save Changes".

### Deactivating a client

1. Go to `/dashboard/clients`.
2. Click the green "Active" badge next to the client.
3. It toggles to "Inactive". No more SMS will be sent for this client.
4. Click again to reactivate.

### Changing SMS templates

1. Go to the client detail page.
2. Edit the "Standard Template" and/or "After Hours Template".
3. Use `{{business_name}}` and `{{booking_link}}` variables.
4. Save changes. New template takes effect immediately for all future missed calls.

---

## Opt-Out Handling

The system automatically handles CTIA-compliant opt-out keywords:

- **STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT** — Caller is marked as opted out. No further SMS will be sent to them from that client.
- **START, YES, UNSTOP** — Caller is re-subscribed.

Opted-out callers appear in the missed calls log with a "Opted Out" badge instead of "SMS Sent".

> Note: Twilio also handles STOP/START at the carrier level. The app's opt-out table is an additional layer of compliance.

---

## Deduplication

If the same caller rings the same client multiple times within 5 minutes, only the first call triggers an SMS. Subsequent calls are logged with a "Deduplicated" badge.

This prevents annoying the caller with multiple texts if they call back immediately.

---

## Troubleshooting

### SMS not sending

1. Check the missed calls log — does it show "Pending" or "SMS Sent"?
2. If "Pending", the webhook may not have fired. Check:
   - Twilio webhook URL is correct
   - Vercel function logs for errors
3. If the Twilio number in the database does not match the actual Twilio number, calls will not be linked to any client.

### Replies not forwarding

1. Check the SMS log for inbound messages.
2. If inbound messages appear but no forward, check:
   - The owner phone number is correct in the client settings
   - Twilio has SMS capability on the number

### Caller getting multiple texts

1. Check if calls are coming from different Twilio numbers for the same client.
2. Verify the dedup window — the system deduplicates within 5 minutes.
3. If calls are more than 5 minutes apart, each triggers an SMS (by design).

### Dashboard loading slowly

1. Check the Supabase dashboard for database health.
2. Consider reducing the period filter (7 days instead of 90).
3. For high-volume operations, add database indexes (already included in schema).

### Twilio webhook errors

1. Go to Twilio Console > Monitor > Logs > Errors & Warnings.
2. Check for HTTP error codes returned by your webhook.
3. Go to Vercel > Deployments > select latest > Functions tab to see server logs.

---

## Cost Tracking

### Per-client costs

- **Twilio number**: ~$1.15/month per number
- **Outbound SMS**: ~$0.0079 per segment (160 chars)
- **Inbound SMS**: ~$0.0075 per segment
- **Voice (incoming)**: ~$0.0085/minute

### Typical monthly cost per client

For a client with ~50 missed calls/month and ~15 replies:
- Number: $1.15
- Outbound SMS (50): $0.40
- Inbound SMS (15): $0.11
- Voice minutes (~25 min): $0.21
- **Total: ~$1.87/month** in Twilio costs

At $97-197/month pricing, margins are excellent.

---

## Scaling Considerations

- **More clients**: The system handles multiple clients via the `clients` table. Each client has their own Twilio number.
- **High volume**: Supabase free tier supports ~500MB database. Upgrade if needed.
- **Rate limits**: Twilio has sending limits that increase with account age. New accounts start at 1 SMS/second.
- **Vercel limits**: Free tier allows 100 serverless function invocations/day. Upgrade to Pro for production use.
