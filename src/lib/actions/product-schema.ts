import { z } from "zod";
import { normalizeFinish } from "@/db/types";

/**
 * Shared product validation schema. Lives outside "use server" because
 * action modules may only export async functions.
 */
export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")
    .max(80)
    .optional()
    .or(z.literal("")),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(10, "Describe the product (min 10 chars)")
    .max(4000),
  price: z
    .number({ message: "Price is required" })
    .int("Whole taka only")
    .min(100)
    .max(100000),
  compareAtPrice: z.number().int().min(100).max(100000).nullable().optional(),
  finish: z.preprocess(
    (val) => normalizeFinish(typeof val === "string" ? val : "") ?? val,
    z.enum(["Exclusive", "Classic", "Signature"])
  ),
  badge: z.enum(["Bestseller", "New", "none"]).optional(),
  shape: z
    .enum(["Almond", "Coffin", "Oval", "Squoval", "Square"])
    .optional()
    .or(z.literal("")),
  color: z
    .enum(["Black", "Gold", "Nude", "Pink", "Red", "Silver", "Yellow"])
    .optional()
    .or(z.literal("")),
  length: z
    .enum(["Extra-long", "Long", "Short"])
    .optional()
    .or(z.literal("")),
  sizes: z.array(z.string().trim().min(1).max(24)).max(24).optional(),
  toneA: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Hex color").optional(),
  toneB: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Hex color").optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

export type ProductFormResult =
  | { ok: true; productId: number; slug: string }
  | { ok: false; error: string };
