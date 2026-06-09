export interface Client {
  id: string;
  name: string;
  phone: string;
  twilio_number: string;
  auto_reply_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  client_id: string;
  caller_phone: string;
  call_status: string;
  sms_sent: boolean;
  sms_body: string;
  created_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  direction: "inbound" | "outbound";
  from_phone: string;
  to_phone: string;
  body: string;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  total_calls: number;
  missed_calls: number;
  sms_sent: number;
  response_rate: number;
  active_clients: number;
}

export interface Subscription {
  id: string;
  client_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: "starter" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due";
  current_period_end: string;
}
