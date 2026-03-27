import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ cleared: true });
  response.cookies.set("tt_paid", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
