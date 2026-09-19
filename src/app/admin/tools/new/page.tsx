import ProductForm, {
  type ProductFormValues,
} from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

const EMPTY_TOOL: ProductFormValues = {
  name: "",
  slug: "",
  tagline: "Tools & Accessories",
  description: "",
  price: "" as unknown as number,
  compareAtPrice: null,
  finish: "Classic",
  badge: "",
  sizes: ["tool"],
  toneA: "#faf7f5",
  toneB: "#e8ded8",
  isActive: true,
  sortOrder: 0,
  isTool: true,
};

export default function NewToolPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">New Tool or Accessory</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Add care tools, application kits, adhesive tabs, or removal essentials to your catalog.
      </p>
      <div className="mt-8">
        <ProductForm initial={EMPTY_TOOL} images={[]} backUrl="/admin/tools" />
      </div>
    </div>
  );
}

