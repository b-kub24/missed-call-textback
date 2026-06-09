import { stripe } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await supabase.from('subscriptions').upsert({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: 'active',
      });
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('subscriptions').update({
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq('stripe_subscription_id', sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
