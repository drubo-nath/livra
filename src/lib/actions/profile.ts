"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, isDbConfigured, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
});

export type UpdateProfileResult =
  | { ok: true; name: string; email: string }
  | { ok: false; error: string };

/**
 * Updates the shopper's profile name and email.
 * The mobile number is deliberately excluded because it is the unique account ID.
 */
export async function updateProfileAction(
  formData: FormData,
): Promise<UpdateProfileResult> {
  const session = await getSessionUser();
  if (!session?.user) {
    return { ok: false, error: "Please sign in to update your profile." };
  }

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid profile details.",
    };
  }

  const { name, email } = parsed.data;

  if (isDbConfigured) {
    try {
      // 1. Update user record (preserving phone_number strictly)
      await db
        .update(schema.user)
        .set({
          name,
          ...(email ? { email } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.user.id, session.user.id));

      // 2. Sync name and email to customer table if customer record exists
      if (session.user.phoneNumber) {
        await db
          .update(schema.customers)
          .set({
            name,
            ...(email ? { email } : {}),
          })
          .where(eq(schema.customers.phone, session.user.phoneNumber));
      }
    } catch (err) {
      console.error("[updateProfileAction] Failed to update profile:", err);
      return { ok: false, error: "Could not save profile changes. Please try again." };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/checkout");

  return { ok: true, name, email: email || "" };
}

