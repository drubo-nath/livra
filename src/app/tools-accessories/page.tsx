import type { Metadata } from "next";
import { listTools } from "@/db/queries";
import ToolsCollectionClient from "@/components/tools/ToolsCollectionClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tools & Accessories — LIVRA Luxury Press-On Nails",
  description:
    "Shop salon-quality nail tools, professional solid gel glue, UV LED lamps, medical-grade adhesive tabs, and damage-free removal pens in Dhaka, Bangladesh.",
  alternates: {
    canonical: "/tools-accessories",
  },
  openGraph: {
    title: "Tools & Accessories — LIVRA Luxury Press-On Nails",
    description:
      "Essential tools for perfect 10-minute press-on manicures. Solid glue kits, UV lamps, and gentle removers.",
    url: "/tools-accessories",
    images: [{ url: "/tools/models-nail-essentials.png", width: 1200, height: 630, alt: "LIVRA Tools and Accessories" }],
  },
};

export default async function ToolsAccessoriesPage() {
  const tools = await listTools();
  return <ToolsCollectionClient tools={tools} />;
}
