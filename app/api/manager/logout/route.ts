import { NextResponse } from "next/server";
import { MANAGER_COOKIE_NAME } from "@/lib/manager-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(MANAGER_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
