import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Missing Stripe webhook environment variables." },
        { status: 500 }
      );
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature." },
        { status: 400 }
      );
    }

    const payload = await request.text();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      return NextResponse.json({ received: true, eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }
}
