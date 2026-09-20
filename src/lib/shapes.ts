export type NailShapeId = "almond" | "coffin" | "oval" | "squoval" | "square";

export interface NailShapeItem {
  id: NailShapeId;
  name: string;
  image: string;
  available: boolean;
  tagline: string;
}

export const NAIL_SHAPES: NailShapeItem[] = [
  {
    id: "almond",
    name: "Almond",
    image: "/shapes/almond.png",
    available: true,
    tagline: "Tapered sides with a soft curved tip",
  },
  {
    id: "coffin",
    name: "Coffin",
    image: "/shapes/coffin.png",
    available: true,
    tagline: "Dramatic tapered edges with a flat square tip",
  },
  {
    id: "oval",
    name: "Oval",
    image: "/shapes/oval.png",
    available: true,
    tagline: "Classic elongated curve for an effortlessly chic look",
  },
  {
    id: "squoval",
    name: "Squoval",
    image: "/shapes/squoval.png",
    available: true,
    tagline: "Universal square contour with softened rounded corners",
  },
  {
    id: "square",
    name: "Square",
    image: "/shapes/square.png",
    available: false, // Coming soon
    tagline: "Clean straight edges with a flat horizontal tip",
  },
];

export const VALID_SHAPE_IDS = NAIL_SHAPES.map((s) => s.id);

/** Normalizes a shape string into a proper title-cased shape or null */
export function normalizeShape(s: string | null | undefined): string | null {
  if (!s) return null;
  const clean = s.trim().toLowerCase();
  const match = NAIL_SHAPES.find((item) => item.id === clean || item.name.toLowerCase() === clean);
  return match ? match.name : null;
}

/** Active shapes available for purchase */
export const ACTIVE_SHAPES = NAIL_SHAPES.filter((s) => s.available);

/**
 * Deterministic mapping to assign a shape to any press-on nail product.
 * Checks explicit mentions in tagline/description first, then falls back to a curated distribution
 * so every active shape has a rich variety of shades.
 */
export function resolveProductShape(p: {
  slug: string;
  tagline?: string | null;
  description?: string | null;
  sizes?: string[] | null;
}): string {
  const text = `${p.tagline ?? ""} ${p.description ?? ""} ${(p.sizes ?? []).join(" ")}`.toLowerCase();

  if (text.includes("coffin")) return "Coffin";
  if (text.includes("almond")) return "Almond";
  if (text.includes("squoval")) return "Squoval";
  if (text.includes("square")) return "Square";
  if (text.includes("oval") || text.includes("stiletto")) return "Oval";

  // Deterministic distribution across the 4 active shapes based on slug hash
  const activeShapes = ["Almond", "Coffin", "Oval", "Squoval"];
  let hash = 0;
  for (let i = 0; i < p.slug.length; i++) {
    hash = (hash << 5) - hash + p.slug.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % activeShapes.length;
  return activeShapes[index];
}

