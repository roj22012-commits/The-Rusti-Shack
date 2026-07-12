import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "rusti_manager_session";
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 12; // 12 hours

function secret(): string {
  const password = process.env.MANAGER_PASSWORD;
  if (!password) throw new Error("MANAGER_PASSWORD is not set");
  return password;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function checkManagerPassword(candidate: string): boolean {
  const expected = secret();
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // Constant-time comparison so response timing can't leak how much of the
  // password guess was correct.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSessionCookieValue(): string {
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;
  const payload = `${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookieValue(value: string | undefined): boolean {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  if (sign(payload) !== signature) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return true;
}

export const MANAGER_COOKIE_NAME = COOKIE_NAME;
export const MANAGER_COOKIE_MAX_AGE_SECONDS = SESSION_LIFETIME_MS / 1000;
