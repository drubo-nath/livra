import ProductForm, {
  type ProductFormValues,
} from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  price: "" as unknown as number,
  compareAtPrice: null,
  finish: "Exclusive",
  badge: "",
  sizes: [],
  toneA: "#e8cfc4",
  toneB: "#a6715c",
  isActive: true,
  sortOrder: 0,
  isTool: false,
};

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Select whether you are adding Press-On Nails or Nail Accessories using the category toggle below.
      </p>
      <div className="mt-8">
        <ProductForm initial={EMPTY} images={[]} />
      </div>
    </div>
  );
}
