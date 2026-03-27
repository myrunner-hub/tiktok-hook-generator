import { NextResponse } from "next/server";

export async function GET(request) {
  const paidCookie = request.cookies.get("tt_paid")?.value;
  return NextResponse.json({ paid: paidCookie === "1" });
}
