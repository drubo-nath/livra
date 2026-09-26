import HeroCarousel from "@/components/home/HeroCarousel";
import Bestsellers from "@/components/home/Bestsellers";
import Ritual from "@/components/home/Ritual";
import ShopByShape from "@/components/home/ShopByShape";
import ToolsSection from "@/components/home/ToolsSection";
import { listTools } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const tools = await listTools();

  return (
    <>
      <HeroCarousel />
      <Bestsellers />
      <Ritual />
      <ShopByShape />
      <ToolsSection tools={tools} />
    </>
  );
}
