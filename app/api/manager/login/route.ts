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

  let correct: boolean;
  try {
    correct = !!body.password && checkManagerPassword(body.password);
  } catch {
    // MANAGER_PASSWORD isn't set in this environment -- a deploy config
    // problem, not a wrong password. Surfacing this distinctly saves
    // real debugging time versus a misleading "incorrect password".
    return NextResponse.json(
      { error: "Server isn't configured with a manager password yet (MANAGER_PASSWORD env var missing)." },
      { status: 500 }
    );
  }

  if (!correct) {
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
