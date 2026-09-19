"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  reorderProductImages,
} from "@/lib/actions/admin";
import { type ProductInput } from "@/lib/actions/product-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/cn";
import { useAdminToast } from "./AdminToast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, ArrowLeft, ArrowRight, Star } from "lucide-react";

const FINISH_OPTIONS = [
  { value: "Exclusive", label: "Exclusive" },
  { value: "Classic", label: "Classic (Single Colours)" },
  { value: "Signature", label: "Signature" },
] as const;
const SIZE_OPTIONS = ["XS", "S", "M", "L"];

export interface ProductFormValues {
  id?: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  finish: string;
  badge: string;
  sizes: string[];
  toneA: string;
  toneB: string;
  isActive: boolean;
  sortOrder: number;
  isTool?: boolean;
}

export interface ProductImageRow {
  id: number;
  url: string;
}

export default function ProductForm({
  initial,
  images: initialImages,
  backUrl,
}: {
  initial: ProductFormValues;
  images: ProductImageRow[];
  backUrl?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial.id);
  const { toast } = useAdminToast();

  const [values, setValues] = useState<ProductFormValues>(initial);
  const [images, setImages] = useState<ProductImageRow[]>(initialImages);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const returnUrl = backUrl || (values.isTool ? "/admin/tools" : "/admin/products");

  const set = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => setValues((v) => ({ ...v, [key]: value }));

  async function handleSave() {
    setError(null);
    setSaving(true);
    const sizes = values.isTool
      ? ["tool"]
      : values.sizes.filter((s) => s !== "tool");

    const input: ProductInput = {
      name: values.name,
      slug: values.slug,
      tagline: values.isTool && !values.tagline ? "Tools & Accessories" : values.tagline,
      description: values.description,
      price: values.price,
      compareAtPrice: values.compareAtPrice,
      finish: (values.isTool ? "Classic" : values.finish) as ProductInput["finish"],
      badge:
        values.badge === ""
          ? undefined
          : (values.badge as ProductInput["badge"]),
      sizes,
      toneA: values.toneA || "#e8cfc4",
      toneB: values.toneB || "#a6715c",
      isActive: values.isActive,
      sortOrder: values.sortOrder,
    };

    try {
      const result = isEdit
        ? await updateProduct(initial.id!, input)
        : await createProduct(input);

      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      if (!isEdit) {
        toast({
          title: values.isTool ? "Tool / Accessory Created" : "Product Created",
          description: `"${input.name}" was added to the catalog.`,
          type: "success",
        });
        router.push(
          values.isTool
            ? `/admin/tools/${result.productId}`
            : `/admin/products/${result.productId}`,
        );
        return;
      }
      setValues((v) => ({ ...v, slug: result.slug }));
      toast({
        title: values.isTool ? "Tool / Accessory Saved" : "Product Saved",
        description: `Changes to "${input.name}" have been saved.`,
        type: "success",
      });
      router.refresh();
      setSaving(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    setUploadNote(null);

    let productId = initial.id;
    if (!productId) {
      // Create the product first so uploaded images can attach to it.
      if (!values.name.trim()) {
        setError("Give the product a name before uploading images.");
        setUploading(false);
        return;
      }
      const created = await createProduct(toInput(values));
      if (!created.ok) {
        setError(created.error);
        setUploading(false);
        return;
      }
      productId = created.productId;
      router.replace(`/admin/products/${productId}`);
    }

    let done = 0;
    for (const file of Array.from(files)) {
      const res = await uploadProductImage(productId, file);
      if (res.ok) {
        // The action already resolved the key into a presigned preview URL.
        setImages((prev) => [...prev, { id: res.imageId, url: res.url }]);
      } else {
        setError(res.error);
      }
      done++;
      setUploadNote(`Uploaded ${done}/${files.length}`);
    }
    setUploading(false);
    setUploadNote(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    startTransition(async () => {
      await reorderProductImages(
        initial.id ?? -1,
        next.map((img) => img.id),
      );
      router.refresh();
    });
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [img] = next.splice(index, 1);
    next.unshift(img);
    setImages(next);
    startTransition(async () => {
      await reorderProductImages(
        initial.id ?? -1,
        next.map((img) => img.id),
      );
      router.refresh();
    });
  }

  function removeImage(id: number) {
    setImages((prev) => prev.filter((img) => img.id !== id));
    toast({
      title: "Image Removed",
      description: "The photo has been removed from the product gallery.",
      type: "delete",
    });
    startTransition(async () => {
      await deleteProductImage(id);
      router.refresh();
    });
  }

  function toggleSize(s: string) {
    const has = values.sizes.includes(s);
    set(
      "sizes",
      has ? values.sizes.filter((x) => x !== s) : [...values.sizes, s],
    );
  }

  return (
    <div className="space-y-8">
      
      {/* ── Details ── */}
      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ── Product Category: Press-On Nails vs Nail Accessories Toggle ── */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
              <div>
                <Label className="text-sm font-semibold tracking-wide text-foreground">
                  Product Category
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select whether you are adding a press-on nail set or a tool / accessory.
                </p>
              </div>
              <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit">
                {values.isTool ? "✂️ Nail Accessories" : "💅 Press-On Nails"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-background p-1.5 border">
              <button
                type="button"
                onClick={() => {
                  set("isTool", false);
                  if (values.tagline === "Tools & Accessories") {
                    set("tagline", "");
                  }
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
                  !values.isTool
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span className="text-sm">💅</span>
                <span>Press-On Nails</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  set("isTool", true);
                  if (!values.tagline) {
                    set("tagline", "Tools & Accessories");
                  }
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
                  values.isTool
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span className="text-sm">✂️</span>
                <span>Nail Accessories</span>
              </button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={values.isTool ? "Magic Glue & Sticky Tabs Kit" : "Rosé All Day"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (auto from name if empty)
                </span>
              </Label>
              <Input
                id="slug"
                value={values.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder={values.isTool ? "magic-glue-kit" : "rose-all-day"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={values.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder={values.isTool ? "Tools & Accessories" : "A soft rosy shimmer for every day"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              rows={5}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={values.isTool ? "Describe this accessory, how to use it, and kit contents…" : "What makes this set special…"}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price (৳) *</Label>
              <Input
                id="price"
                type="number"
                min={100}
                max={100000}
                value={Number.isFinite(values.price) ? values.price : ""}
                onChange={(e) =>
                  set("price", e.target.value ? Number(e.target.value) : ("" as unknown as number))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compareAtPrice">
                Compare-at price{" "}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="compareAtPrice"
                type="number"
                min={100}
                max={100000}
                value={values.compareAtPrice ?? ""}
                onChange={(e) =>
                  set(
                    "compareAtPrice",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </div>

            {!values.isTool ? (
              <div className="space-y-2">
                <Label>Finish *</Label>
                <Select
                  value={values.finish}
                  onValueChange={(v) => set("finish", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINISH_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Badge</Label>
                <Select
                  value={values.badge || "none"}
                  onValueChange={(v) => set("badge", v === "none" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Bestseller">Bestseller</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!values.isTool && (
            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Badge</Label>
                <Select
                  value={values.badge || "none"}
                  onValueChange={(v) => set("badge", v === "none" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Bestseller">Bestseller</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toneA">Fallback tone A</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="toneA"
                    type="color"
                    value={values.toneA}
                    onChange={(e) => set("toneA", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border"
                  />
                  <Input
                    value={values.toneA}
                    onChange={(e) => set("toneA", e.target.value)}
                    className="w-28 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toneB">Fallback tone B</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="toneB"
                    type="color"
                    value={values.toneB}
                    onChange={(e) => set("toneB", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border"
                  />
                  <Input
                    value={values.toneB}
                    onChange={(e) => set("toneB", e.target.value)}
                    className="w-28 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {!values.isTool && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Available sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {SIZE_OPTIONS.map((s) => {
                    const active = values.sizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSize(s)}
                        className={`h-9 min-w-11 rounded-md border px-3 text-sm transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-accent"
                        }`}
                        aria-pressed={active}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave all off to fall back to the standard XS–L range.
                </p>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={values.isActive}
                onCheckedChange={(c) => set("isActive", c)}
              />
              <Label htmlFor="isActive">
                {values.isActive ? "Live on store" : "Hidden from store"}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sortOrder" className="shrink-0">
                Sort order
              </Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                max={9999}
                className="w-24"
                value={values.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Images ── */}
      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            Upload multiple photos. The first image is the cover shown across the
            store — drag is not needed, use the arrows to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading || saving}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                "+ Upload images"
              )}
            </Button>
            {uploadNote && (
              <span className="text-sm text-muted-foreground">{uploadNote}</span>
            )}
            <span className="text-xs text-muted-foreground">
              JPG / PNG / WebP / AVIF · up to 5 MB each
            </span>
          </div>

          {images.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img, i) => (
                <li
                  key={img.id}
                  className="group relative overflow-hidden rounded-lg border"
                >
                  <div className="relative aspect-square bg-muted">
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-cover"
                    />
                  </div>
                  {i === 0 && (
                    <Badge className="absolute left-2 top-2">Cover</Badge>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/85 p-1.5 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label="Move earlier"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === images.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="Move later"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() => makeCover(i)}
                        aria-label="Make cover image"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeImage(img.id)}
                        aria-label="Delete image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No images yet — without one, the gradient swatch is shown instead.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving || uploading}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : isEdit ? (
            "Save changes"
          ) : values.isTool ? (
            "Create tool / accessory"
          ) : (
            "Create nail set"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(returnUrl)}>
          {values.isTool ? "← Back to Tools" : "← Back to Products"}
        </Button>
      </div>
    </div>
  );
}

function toInput(v: ProductFormValues): ProductInput {
  return {
    name: v.name,
    slug: v.slug,
    tagline: v.tagline,
    description: v.description,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    finish: v.finish as ProductInput["finish"],
    badge:
      v.badge === "" ? undefined : (v.badge as ProductInput["badge"]),
    sizes: v.sizes,
    toneA: v.toneA,
    toneB: v.toneB,
    isActive: v.isActive,
    sortOrder: v.sortOrder,
  };
}
