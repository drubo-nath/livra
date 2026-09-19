"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { formatBDT } from "@/lib/format";
import { toggleProductActive, deleteProduct } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminToast } from "./AdminToast";
import ConfirmDialog from "./ConfirmDialog";
import { Loader2 } from "lucide-react";

export interface AdminProductRow {
  id: number;
  slug: string;
  name: string;
  finish: string;
  badge: string | null;
  price: number;
  isActive: boolean;
  imageUrl: string | null;
  imageCount: number;
  isTool?: boolean;
}

interface ProductsTableProps {
  initialProducts: AdminProductRow[];
  covers: Record<number, string | null>;
  mode?: "products" | "tools";
  title?: string;
  subtitle?: string;
  newHref?: string;
  newButtonText?: string;
  editBaseHref?: string;
}

export default function ProductsTable({
  initialProducts,
  covers,
  mode = "products",
  title,
  subtitle,
  newHref,
  newButtonText,
  editBaseHref,
}: ProductsTableProps) {
  const [products, setProducts] = useState<AdminProductRow[]>(initialProducts);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useAdminToast();

  const isToolsMode = mode === "tools";
  const displayTitle = title || (isToolsMode ? "Tools & Accessories" : "Products");
  const hiddenCount = products.filter((p) => !p.isActive).length;
  const displaySubtitle =
    subtitle ||
    (isToolsMode
      ? `${products.length} tools & accessories · ${hiddenCount} hidden`
      : `${products.length} products · ${hiddenCount} hidden`);
  const displayNewHref = newHref || (isToolsMode ? "/admin/tools/new" : "/admin/products/new");
  const displayNewText = newButtonText || (isToolsMode ? "+ New Tool / Accessory" : "+ New product");
  const editPrefix = editBaseHref || (isToolsMode ? "/admin/tools" : "/admin/products");

  const handleToggleActive = (product: AdminProductRow) => {
    const nextState = !product.isActive;
    setPendingActionId(product.id);

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isActive: nextState } : p))
    );

    startTransition(async () => {
      try {
        await toggleProductActive(product.id, nextState);
        toast({
          title: nextState ? "Product Published" : "Product Hidden",
          description: nextState
            ? `"${product.name}" is now visible to customers.`
            : `"${product.name}" is now hidden from the storefront.`,
          type: nextState ? "publish" : "hide",
        });
      } catch (err) {
        // Revert on error
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, isActive: product.isActive } : p
          )
        );
        toast({
          title: "Update Failed",
          description: err instanceof Error ? err.message : "Could not update status",
          type: "error",
        });
      } finally {
        setPendingActionId(null);
      }
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await deleteProduct(deleteTarget.id);
      
      // Animate product removal from local list
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      
      toast({
        title: "Product Deleted",
        description: `"${deleteTarget.name}" has been permanently removed.`,
        type: "delete",
      });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: "Deletion Failed",
        description: err instanceof Error ? err.message : "Could not delete product",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{displayTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {displaySubtitle}
          </p>
        </div>
        <Button asChild>
          <Link href={displayNewHref}>{displayNewText}</Link>
        </Button>
      </div>

      <div className="mt-6 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Image</TableHead>
              <TableHead>{isToolsMode ? "Tool / Accessory" : "Product"}</TableHead>
              {!isToolsMode && <TableHead>Finish</TableHead>}
              <TableHead>Price</TableHead>
              <TableHead>Images</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {products.map((p) => {
                const cover = covers[p.id] || null;
                const isProcessing = pendingActionId === p.id && isPending;

                return (
                  <motion.tr
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: p.isActive ? 1 : 0.6,
                      y: 0,
                      transition: { duration: 0.3 },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.96,
                      height: 0,
                      transition: { duration: 0.25 },
                    }}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <TableCell>
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-muted">
                        {cover ? (
                          <Image
                            src={cover}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(155deg, var(--color-blush), var(--color-clay))",
                            }}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {p.name}
                        {p.badge && (
                          <Badge variant="secondary" className="ml-2">
                            {p.badge}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">/{p.slug}</p>
                    </TableCell>
                    {!isToolsMode && (
                      <TableCell>
                        {p.isTool ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200">
                            Tool &amp; Accessory
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{p.finish}</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-numeric font-medium">{formatBDT(p.price)}</TableCell>
                    <TableCell className="text-muted-foreground font-numeric">
                      {Number(p.imageCount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.isActive ? "default" : "outline"}
                        className="transition-colors duration-200"
                      >
                        {p.isActive ? "Live" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`${editPrefix}/${p.id}`}>Edit</Link>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(p)}
                          disabled={isProcessing}
                          className="min-w-[64px]"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : p.isActive ? (
                            "Hide"
                          ) : (
                            "Publish"
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(p)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>

            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No products yet — create your first one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Animated Confirmation Dialog for Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Product?"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => (isDeleting ? null : setDeleteTarget(null))}
      />
    </>
  );
}

