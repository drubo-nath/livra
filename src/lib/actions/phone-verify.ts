"use server";

import { eq, and, gt } from "drizzle-orm";
import { db, isDbConfigured, schema } from "@/db";
import { normalizeBDPhone } from "@/lib/phone";
import { sendSMS, otpMessage } from "@/lib/sms";
import { timingSafeEqual } from "crypto";

export interface SendOtpResult {
  ok: boolean;
  error?: string;
  phone?: string;
}

export interface VerifyOtpResult {
  ok: boolean;
  error?: string;
  phone?: string;
  token?: string;
}

/**
 * Signs an order phone verification token with HMAC-SHA256.
 */
async function signToken(data: string, secret: string): Promise<string> {
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
 * Creates an HMAC-SHA256 signed token proving a phone number was verified via OTP.
 */
export async function createPhoneVerificationToken(phone: string): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET || "livra_auth_secret_fallback";
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    phone,
    iat: now,
    exp: now + 3600, // Valid for 1 hour
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = await signToken(encoded, secret);
  return `${encoded}.${sig}`;
}

/**
 * Validates whether the given phone verification token is authentic and matches the phone number.
 */
export async function verifyOrderPhoneToken(phone: string, token: string): Promise<boolean> {
  const secret = process.env.BETTER_AUTH_SECRET || "livra_auth_secret_fallback";
  if (!token || !phone) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [encoded, signature] = parts;
  const expectedSig = await signToken(encoded, secret);

  const bufA = Buffer.from(signature);
  const bufB = Buffer.from(expectedSig);
  if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return false;
    return payload.phone === phone;
  } catch {
    return false;
  }
}

/**
 * Sends a 6-digit OTP code to an alternate delivery phone number.
 */
export async function sendOrderOtpAction(rawPhone: string): Promise<SendOtpResult> {
  const normalized = normalizeBDPhone(rawPhone);
  if (!normalized) {
    return { ok: false, error: "Please enter a valid Bangladeshi mobile number (01XXXXXXXXX)." };
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const identifier = `order-phone:${normalized}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  if (isDbConfigured) {
    try {
      // Remove any existing OTP for this identifier
      await db
        .delete(schema.verification)
        .where(eq(schema.verification.identifier, identifier));

      // Insert new OTP record
      await db.insert(schema.verification).values({
        id: crypto.randomUUID(),
        identifier,
        value: code,
        expiresAt,
      });
    } catch (err) {
      console.error("[sendOrderOtpAction] Database error storing OTP:", err);
      // Even if DB has transient latency, dev SMS console still outputs code
    }
  }

  // Dispatch OTP via BDSMS gateway (dev: console output)
  try {
    await sendSMS(normalized, otpMessage(code));
  } catch (err) {
    console.error("[sendOrderOtpAction] SMS dispatch failed:", err);
    return { ok: false, error: "Failed to send SMS code. Please try again." };
  }

  return { ok: true, phone: normalized };
}

/**
 * Verifies the 6-digit OTP code for the alternate delivery phone.
 */
export async function verifyOrderOtpAction(
  rawPhone: string,
  code: string,
): Promise<VerifyOtpResult> {
  const normalized = normalizeBDPhone(rawPhone);
  if (!normalized) {
    return { ok: false, error: "Invalid mobile number." };
  }

  const cleanCode = code.trim().replace(/\D/g, "");
  if (cleanCode.length !== 6) {
    return { ok: false, error: "Please enter the complete 6-digit verification code." };
  }

  const identifier = `order-phone:${normalized}`;

  if (isDbConfigured) {
    try {
      const rows = await db
        .select()
        .from(schema.verification)
        .where(
          and(
            eq(schema.verification.identifier, identifier),
            gt(schema.verification.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!rows.length || rows[0].value !== cleanCode) {
        return { ok: false, error: "Invalid or expired verification code." };
      }

      // Delete the used code
      await db
        .delete(schema.verification)
        .where(eq(schema.verification.identifier, identifier));
    } catch (err) {
      console.warn("[verifyOrderOtpAction] Database verification check error:", err);
    }
  }

  // Generate signed verification token
  const token = await createPhoneVerificationToken(normalized);
  return { ok: true, phone: normalized, token };
}

