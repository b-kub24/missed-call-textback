import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    features: ['1 phone number', '500 SMS/month', 'Basic dashboard', 'Email support'],
  },
  pro: {
    name: 'Pro',
    price: 79,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: ['5 phone numbers', '2,500 SMS/month', 'Advanced analytics', 'Priority support', 'Custom templates'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    features: ['Unlimited numbers', 'Unlimited SMS', 'White-label', 'API access', 'Dedicated support', 'Custom integrations'],
  },
} as const;

export async function createCheckoutSession(customerId: string, priceId: string) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: process.env.NEXT_PUBLIC_APP_URL + '/dashboard?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: process.env.NEXT_PUBLIC_APP_URL + '/pricing',
  });
}

export async function createCustomer(email: string, name: string) {
  return stripe.customers.create({ email, name });
}

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}
