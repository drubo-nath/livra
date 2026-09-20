/** DB-agnostic types and constants shared between server and client. */

export type Finish = "Exclusive" | "Classic" | "Signature";

export const finishes: Finish[] = ["Exclusive", "Classic", "Signature"];

export const finishDisplayLabels: Record<Finish, string> = {
  Exclusive: "Exclusive",
  Classic: "Classic (Single Colours)",
  Signature: "Signature",
};

/** Normalize legacy finish values (Creme -> Exclusive, Glazed -> Classic, Shimmer -> Signature) */
export function normalizeFinish(f: string | null | undefined): Finish | null {
  if (!f) return null;
  const lower = f.toLowerCase().trim();
  if (lower === "creme" || lower === "exclusive") return "Exclusive";
  if (lower === "glazed" || lower === "classic" || lower.includes("single colour")) return "Classic";
  if (lower === "shimmer" || lower === "signature") return "Signature";
  return null;
}

export interface ProductDTO {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  finish: Finish;
  badge: "Bestseller" | "New" | null;
  tones: [string, string];
  imageUrl: string | null;
  /** Press-on nail shape (Almond, Coffin, Oval, Squoval, Square) */
  shape: string;
  /** Admin-configured sizes; empty means the standard XS–L range. */
  sizes: string[];
  /** Gallery ordered by position; index 0 is the cover. */
  images: string[];
}

export interface ReviewDTO {
  id: number;
  authorName: string;
  location: string;
  rating: number;
  body: string;
}
