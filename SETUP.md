# InstantReply — Setup & Deployment Guide

Complete guide to deploying the Missed-Call Text-Back Automation system.

---

## Prerequisites

- **Node.js** 18+ installed locally
- A **Supabase** account (free tier works)
- A **Twilio** account with credits
- A **Vercel** account (free tier works)
- A **GitHub** account (for Vercel deployment)

---

## Step 1: Supabase Setup

### 1.1 Create a project

1. Go to [app.supabase.com](https://app.supabase.com) and sign in.
2. Click **New Project**.
3. Choose a name (e.g., `instantreply`), set a database password, and pick a region close to your users.
4. Wait for the project to provision (~2 minutes).

### 1.2 Run the schema migration

1. In the Supabase dashboard, go to **SQL Editor**.
2. Open the file `supabase/schema.sql` from this project.
3. Paste the entire contents into the SQL Editor.
4. Click **Run**. You should see success messages for all tables, indexes, and policies.

### 1.3 Collect your keys

Go to **Settings > API** in the Supabase dashboard and copy:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon public key** — starts with `eyJ...`
- **service_role key** — starts with `eyJ...` (keep this secret!)

---

## Step 2: Twilio Setup

### 2.1 Create a Twilio account

1. Sign up at [twilio.com](https://www.twilio.com).
2. Complete phone verification.
3. From the Twilio Console dashboard, copy your **Account SID** and **Auth Token**.

### 2.2 Buy a phone number

1. Go to **Phone Numbers > Manage > Buy a Number**.
2. Search for a number with **Voice** and **SMS** capabilities.
3. Purchase the number (starts at $1.15/month).
4. Copy the full number in E.164 format (e.g., `+15551234567`).

### 2.3 Configure webhooks

For each Twilio number you provision for a client:

1. Go to **Phone Numbers > Manage > Active Numbers**.
2. Click on the number.
3. Under **Voice Configuration**:
   - Set "A call comes in" to **Webhook** and enter: `https://your-app.vercel.app/api/webhooks/twilio/voice-status`
   - Set HTTP method to **POST**
   - Under "Call status changes", set the Status Callback URL to: `https://your-app.vercel.app/api/webhooks/twilio/voice-status`
4. Under **Messaging Configuration**:
   - Set "A message comes in" to **Webhook** and enter: `https://your-app.vercel.app/api/webhooks/twilio/sms-inbound`
   - Set HTTP method to **POST**
5. Click **Save configuration**.

> **Important**: Replace `your-app.vercel.app` with your actual Vercel deployment URL.

### 2.4 Configure call handling (TwiML Bin)

To make calls ring and then report as "no-answer" when missed, create a TwiML Bin:

1. Go to **Explore Products > Developer Tools > TwiML Bins**.
2. Click **Create new TwiML Bin**.
3. Name it `ring-then-miss`.
4. Paste this TwiML:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <Response>
     <Dial timeout="20" action="https://your-app.vercel.app/api/webhooks/twilio/voice-status">
       <Number>+15551234567</Number>
     </Dial>
   </Response>
   ```
   Replace `+15551234567` with the business owner's actual phone number.
5. Save the TwiML Bin.
6. Go back to the phone number config and set "A call comes in" to this TwiML Bin.

This makes the call ring the owner's phone for 20 seconds. If they don't answer, Twilio calls the voice-status webhook with `CallStatus=no-answer`.

---

## Step 3: Deploy to Vercel

### 3.1 Push to GitHub

1. Create a new GitHub repository.
2. Push this project:
   ```bash
   cd missed-call-textback
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USER/missed-call-textback.git
   git push -u origin main
   ```

### 3.2 Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New > Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
   | `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
   | `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL (update after first deploy) |

5. Click **Deploy**.
6. After deployment, note your URL (e.g., `https://missed-call-textback.vercel.app`).
7. Go back to Vercel settings and update `NEXT_PUBLIC_APP_URL` with the actual URL.
8. Also update all Twilio webhook URLs (Step 2.3) with the actual Vercel URL.

---

## Step 4: Verify the Setup

### 4.1 Test the landing page

Visit your deployment URL. You should see the marketing landing page.

### 4.2 Test the dashboard

Visit `/dashboard`. It should load (with empty data initially).

### 4.3 Test onboarding

1. Visit `/onboard`.
2. Fill in the form with a test client's details.
3. Submit. You should be redirected to the client detail page.

### 4.4 Test the call flow

1. Call the Twilio number from a phone.
2. Let it ring without answering.
3. Within 5 seconds, the caller should receive an SMS.
4. Reply to the SMS — it should be forwarded to the owner's phone.
5. Check the dashboard — the missed call and SMS should appear in the logs.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio Auth Token |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployed app URL |
| `TWILIO_WEBHOOK_SECRET` | No | Optional secret for webhook validation |

---

## Troubleshooting Setup

**"Missing NEXT_PUBLIC_SUPABASE_URL" error**
- Make sure all environment variables are set in Vercel.
- Redeploy after adding variables.

**Twilio webhooks return 500**
- Check Vercel Function logs (Vercel Dashboard > Deployments > Functions).
- Ensure the Supabase service role key is correct.
- Ensure the Twilio number exists in the `clients` table.

**SMS not sending**
- Check Twilio console for error logs.
- Ensure the Twilio number has SMS capability.
- Verify the `twilio_number` in the clients table matches the Twilio number exactly (E.164 format).

**Dashboard shows no data**
- Make sure at least one client is created via `/onboard`.
- Check the browser console for API errors.
