"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncOrderPaymentAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { useAdminToast } from "./AdminToast";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface SyncPaymentButtonProps {
  orderId: number;
  orderNumber: string;
  paymentStatus: string;
}

export default function SyncPaymentButton({
  orderId,
  orderNumber,
  paymentStatus,
}: SyncPaymentButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useAdminToast();
  const router = useRouter();

  const handleSync = () => {
    startTransition(async () => {
      try {
        const res = await syncOrderPaymentAction(orderId);
        if (res.ok) {
          toast({
            title: "Payment Verified",
            description: res.message,
            type: "success",
          });
          router.refresh();
        } else {
          toast({
            title: "Gateway Check",
            description: res.message,
            type: "error",
          });
        }
      } catch (err) {
        toast({
          title: "Verification Failed",
          description: err instanceof Error ? err.message : "Could not reach gateway",
          type: "error",
        });
      }
    });
  };

  if (paymentStatus === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Verified Paid
      </span>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleSync}
      disabled={isPending}
      className="h-8 gap-1.5 text-xs font-medium"
      title={`Query SSLCommerz for order ${orderNumber}`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      <span>{isPending ? "Validating with Bank…" : "Sync with SSLCommerz"}</span>
    </Button>
  );
}
