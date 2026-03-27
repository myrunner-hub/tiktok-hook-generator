import { NextResponse } from "next/server";

const MAX_EMAILS = 2000;

const emailStore = globalThis.__tt_email_store || [];
globalThis.__tt_email_store = emailStore;

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    const normalized = String(email || "").trim().toLowerCase();

    if (!normalized || !validateEmail(normalized)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // MVP storage: keep in-memory for this runtime. For production, swap
    // this with a real DB (KV, Redis, Supabase, etc.).
    emailStore.push({
      email: normalized,
      createdAt: new Date().toISOString(),
    });

    if (emailStore.length > MAX_EMAILS) {
      emailStore.splice(0, emailStore.length - MAX_EMAILS);
    }

    return NextResponse.json({ ok: true, stored: emailStore.length });
  } catch {
    return NextResponse.json(
      { error: "Unable to capture email." },
      { status: 500 }
    );
  }
}

