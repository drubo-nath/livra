import type { ProductDTO } from "@/db/types";

export const FILTER_COLORS = [
  "Black",
  "Gold",
  "Nude",
  "Pink",
  "Red",
  "Silver",
  "Yellow",
] as const;

export type FilterColor = (typeof FILTER_COLORS)[number];

export const FILTER_LENGTHS = [
  "Extra-long",
  "Long",
  "Short",
] as const;

export type FilterLength = (typeof FILTER_LENGTHS)[number];

/** Resolve product primary color category based on name, tones, and description */
export function resolveProductColor(p: {
  slug: string;
  name: string;
  description?: string | null;
  tones?: [string, string];
}): FilterColor {
  const text = `${p.name} ${p.slug} ${p.description ?? ""}`.toLowerCase();

  if (text.includes("black") || text.includes("onyx") || text.includes("noir") || text.includes("midnight")) {
    return "Black";
  }
  if (text.includes("gold") || text.includes("champagne") || text.includes("honey") || text.includes("amber")) {
    return "Gold";
  }
  if (text.includes("red") || text.includes("rouge") || text.includes("wine") || text.includes("cherry") || text.includes("crimson")) {
    return "Red";
  }
  if (text.includes("silver") || text.includes("chrome") || text.includes("icy") || text.includes("glaze") || text.includes("veil")) {
    return "Silver";
  }
  if (text.includes("pink") || text.includes("petal") || text.includes("rose") || text.includes("blush") || text.includes("mauve")) {
    return "Pink";
  }
  if (text.includes("yellow") || text.includes("sun") || text.includes("lemon") || text.includes("canary")) {
    return "Yellow";
  }
  if (text.includes("nude") || text.includes("neutral") || text.includes("sugar") || text.includes("marshmallow") || text.includes("beige") || text.includes("sand")) {
    return "Nude";
  }

  // Inspect hex tone if available
  if (p.tones && p.tones[0]) {
    const hex = p.tones[0].toLowerCase();
    if (hex.startsWith("#b14") || hex.startsWith("#6e2") || hex.startsWith("#e53")) return "Red";
    if (hex.startsWith("#f2d") || hex.startsWith("#dfa") || hex.startsWith("#f8c")) return "Pink";
    if (hex.startsWith("#f4e") || hex.startsWith("#d8c") || hex.startsWith("#e8d")) return "Nude";
  }

  // Deterministic fallback across the luxury color palette
  const list: FilterColor[] = ["Nude", "Pink", "Red", "Gold", "Silver", "Black", "Yellow"];
  let hash = 0;
  for (let i = 0; i < p.slug.length; i++) {
    hash = (hash << 5) - hash + p.slug.charCodeAt(i);
    hash |= 0;
  }
  return list[Math.abs(hash) % list.length];
}

/** Resolve product nail length based on shape and specifications */
export function resolveProductLength(p: {
  slug: string;
  shape?: string | null;
  tagline?: string | null;
  description?: string | null;
}): FilterLength {
  const text = `${p.tagline ?? ""} ${p.description ?? ""}`.toLowerCase();
  const shape = (p.shape ?? "").toLowerCase();

  if (text.includes("extra-long") || text.includes("extra long") || text.includes("xxl")) {
    return "Extra-long";
  }
  if (text.includes("short") || shape === "squoval") {
    return "Short";
  }
  if (shape === "coffin") {
    return "Extra-long";
  }
  if (shape === "almond" || shape === "oval" || text.includes("long")) {
    return "Long";
  }

  // Deterministic distribution
  const list: FilterLength[] = ["Extra-long", "Long", "Short"];
  let hash = 0;
  for (let i = 0; i < p.slug.length; i++) {
    hash = (hash << 5) - hash + p.slug.charCodeAt(i);
    hash |= 0;
  }
  return list[Math.abs(hash) % list.length];
}

