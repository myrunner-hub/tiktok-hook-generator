import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY environment variable." },
        { status: 500 }
      );
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const isPaid = session?.payment_status === "paid";

    if (!isPaid) {
      return NextResponse.json(
        { error: "Payment not completed for this session." },
        { status: 402 }
      );
    }

    const response = NextResponse.json({ paid: true });
    response.cookies.set("tt_paid", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to verify checkout session." },
      { status: 500 }
    );
  }
}
