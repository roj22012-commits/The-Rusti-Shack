import { NextResponse } from "next/server";
import {
  checkManagerPassword,
  createSessionCookieValue,
  MANAGER_COOKIE_NAME,
  MANAGER_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/manager-auth";

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.password || !checkManagerPassword(body.password)) {
    // Deliberately vague: don't confirm whether a password was "close".
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(MANAGER_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MANAGER_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
