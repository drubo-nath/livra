"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminToast } from "./AdminToast";
import { Loader2 } from "lucide-react";

const STATUSES = ["pending", "confirmed", "fulfilled", "cancelled"] as const;
type OrderStatus = (typeof STATUSES)[number];

interface OrderStatusSelectorProps {
  orderId: number;
  orderNumber: string;
  currentStatus: OrderStatus;
}

export default function OrderStatusSelector({
  orderId,
  orderNumber,
  currentStatus,
}: OrderStatusSelectorProps) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const { toast } = useAdminToast();
  const router = useRouter();

  const handleUpdate = () => {
    if (status === currentStatus) return;

    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, status);
        toast({
          title: "Order Status Updated",
          description: `Order ${orderNumber} is now marked as ${status}.`,
          type: "success",
        });
        router.refresh();
      } catch (err) {
        toast({
          title: "Update Failed",
          description: err instanceof Error ? err.message : "Could not update status",
          type: "error",
        });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={status}
        onValueChange={(val) => setStatus(val as OrderStatus)}
        disabled={isPending}
      >
        <SelectTrigger className="w-40 capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        onClick={handleUpdate}
        disabled={isPending || status === currentStatus}
        className="cursor-pointer gap-2"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Update
      </Button>
    </div>
  );
}

