"use server";

import { redirect } from "next/navigation";
import {
  verifyAdminCredentials,
  createAdminSessionToken,
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "@/lib/admin-auth";

export interface AdminLoginState {
  error?: string;
  success?: boolean;
}

export async function adminLoginAction(
  _prevState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const identifier = formData.get("identifier")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!identifier.trim() || !password) {
    return { error: "Please enter both username/email and password." };
  }

  const isValid = verifyAdminCredentials(identifier, password);
  if (!isValid) {
    // Artificial small delay to mitigate brute force timing
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Invalid credentials. Access denied." };
  }

  try {
    const token = await createAdminSessionToken();
    await setAdminSessionCookie(token);
  } catch (err) {
    console.error("[adminLoginAction] Failed to establish admin session:", err);
    return { error: "Failed to establish secure session. Please check server configuration." };
  }

  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  await clearAdminSessionCookie();
  redirect("/");
}

