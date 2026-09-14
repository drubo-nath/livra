import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "livra_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AdminSessionUser {
  id: string;
  name: string;
  email: string;
  role: "admin";
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSession {
  user: AdminSessionUser;
  session: AdminSessionRecord;
}

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: "admin";
  exp: number;
  iat: number;
}

/**
 * Returns the secret login route path (defaults to /atelier-portal).
 */
export function getSecretAdminPath(): string {
  const p = process.env.ADMIN_SECRET_PATH || "/atelier-portal";
  return p.startsWith("/") ? p : `/${p}`;
}

/**
 * Fallback admin credentials for development if not explicitly configured in .env.local.
 */
function getAdminCredentials() {
  return {
    username: (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim(),
    email: (process.env.ADMIN_EMAIL || "admin@livrapressons.com").toLowerCase().trim(),
    password: process.env.ADMIN_PASSWORD || "LIVRA@Admin2026!",
  };
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to equalize timing
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validates the admin identifier (username or email) and password.
 */
export function verifyAdminCredentials(identifier: string, password: string): boolean {
  const creds = getAdminCredentials();
  const id = identifier.toLowerCase().trim();

  const isUsernameMatch = safeCompare(id, creds.username);
  const isEmailMatch = safeCompare(id, creds.email);
  const isPasswordMatch = safeCompare(password, creds.password);

  return (isUsernameMatch || isEmailMatch) && isPasswordMatch;
}

/**
 * Generates an HMAC-SHA256 signature for the given data using BETTER_AUTH_SECRET.
 */
async function sign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(signature).toString("base64url");
}

/**
 * Verifies an HMAC-SHA256 signature.
 */
async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(data, secret);
  return safeCompare(expected, signature);
}

/**
 * Creates a cryptographically signed admin session token.
 */
export async function createAdminSessionToken(): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set");
  }

  const creds = getAdminCredentials();
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: "admin-master",
    email: creds.email,
    name: "LIVRA Admin",
    role: "admin",
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes the admin session token.
 */
export async function verifyAdminSessionToken(token: string): Promise<AdminSession | null> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const isValid = await verifySignature(encodedPayload, signature, secret);
  if (!isValid) return null;

  try {
    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const payload: TokenPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;
    if (payload.role !== "admin") return null;

    const createdAt = new Date(payload.iat * 1000);
    const expiresAt = new Date(payload.exp * 1000);

    return {
      user: {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: "admin",
        phoneNumber: null,
        phoneNumberVerified: true,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      },
      session: {
        id: `sess_${encodedPayload.slice(0, 16)}`,
        userId: payload.sub,
        expiresAt,
        token,
        createdAt,
        updatedAt: createdAt,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the admin session from HTTP cookies in server context.
 */
export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyAdminSessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Sets the admin session HttpOnly cookie.
 */
export async function setAdminSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the admin session HttpOnly cookie.
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: ADMIN_COOKIE_NAME,
    path: "/",
  });
}

