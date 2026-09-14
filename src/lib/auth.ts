import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, phoneNumber } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { sendSMS, otpMessage } from "@/lib/sms";
import { normalizeBDPhone } from "@/lib/phone";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set — add it to .env.local (see .env.example).",
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  plugins: [
    phoneNumber({
      /** OTPs are delivered through the BDSMS gateway (dev: console). */
      async sendOTP({ phoneNumber, code }) {
        console.log('hello')
        await sendSMS(phoneNumber, otpMessage(code));
      },
      /** Enforce E.164 BD format everywhere it touches the DB. */
      phoneNumberValidator: (phone) => normalizeBDPhone(phone) !== null,
      requireVerification: true,
      otpLength: 6,
      expiresIn: 300,
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace("+", "")}@sms.liora.bd`,
        getTempName: (phone) => `Guest ${phone.slice(-4)}`,
      },
    }),
    admin(),
    /** Required for server actions / route handlers to set cookies. */
    nextCookies(),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },
});

/** Helper for server components/actions: resolve the current session. */
export async function getSessionUser() {
  // 1. Check dedicated admin session cookie first (password-based secret login)
  try {
    const { getAdminSessionFromCookies } = await import("@/lib/admin-auth");
    const adminSession = await getAdminSessionFromCookies();
    if (adminSession) {
      return adminSession;
    }
  } catch (err) {
    console.error("[getSessionUser] Error checking admin session:", err);
  }

  // 2. Fall back to Better Auth session (OTP customer users)
  try {
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({ headers: await headers() });
    return session ?? null;
  } catch {
    return null;
  }
}
