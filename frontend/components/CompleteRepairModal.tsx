"use client";

import { useState } from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { completeRepair } from "@/app/actions/repairs";
import { InventoryItem, ServiceRequest } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

const repairSchema: z.ZodType<RepairFormValues> = z.object({
  resolutionDetails: z.string().min(0, "Please provide detailed resolution notes."),
  usedParts: z.array(
    z.object({
      partId: z.coerce.number().min(1, "Please select a part"),
      quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    })
  ).default([]),
  laborCost: z.coerce.number().min(0, "Labor cost cannot be negative").optional(),
}) as any;

type UsedPart = {
  partId: number;
  quantity: number;
};

type RepairFormValues = {
  resolutionDetails: string;
  usedParts: UsedPart[];
  laborCost?: number;
};

interface CompleteRepairModalProps {
  request: ServiceRequest | null;
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
}

export function CompleteRepairModal({ request, isOpen, onClose, inventory }: CompleteRepairModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RepairFormValues>({
    resolver: zodResolver(repairSchema as any),
    defaultValues: {
      resolutionDetails: "",
      usedParts: [],
      laborCost: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "usedParts",
  });

  const onSubmit: SubmitHandler<RepairFormValues> = async (data) => {
    if (!request) return;
    setIsSubmitting(true);

    try {
      const result = await completeRepair(
        request.id,
        data.resolutionDetails,
        data.usedParts,
        data.laborCost
      );

      if (result.success) {
        toast.success("Repair completed successfully!");
        reset();
        onClose();
      } else {
        toast.error(result.message || "Failed to complete repair.");
      }
    } catch (error) {
      console.error(error); // Log lỗi để debug
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Repair: {request?.asset?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resolutionDetails">Resolution Details</Label>
            <Textarea
              id="resolutionDetails"
              placeholder="Describe what was repaired..."
              {...register("resolutionDetails")}
              className="h-24"
            />
            {errors.resolutionDetails && (
              <p className="text-sm text-red-500">{errors.resolutionDetails.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="laborCost">Labor Cost</Label>
            <Input
              id="laborCost"
              type="number"
              min="0"
              step="1000"
              {...register("laborCost")}
            />
            {errors.laborCost && (
              <p className="text-sm text-red-500">{errors.laborCost.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Used Parts (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ partId: 0, quantity: 1 })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Part
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <select
                    {...register(`usedParts.${index}.partId` as const)}
                    className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="0" disabled>Select part</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.partName} (Stock: {item.quantity})
                      </option>
                    ))}
                  </select>
                  {/* Truy cập lỗi an toàn hơn cho Array */}
                  {errors.usedParts?.[index]?.partId && (
                    <p className="text-xs text-red-500">
                      {errors.usedParts[index]?.partId?.message}
                    </p>
                  )}
                </div>

                <div className="w-24 space-y-1">
                  <Input
                    type="number"
                    min="1"
                    {...register(`usedParts.${index}.quantity` as const)}
                  />
                  {errors.usedParts?.[index]?.quantity && (
                    <p className="text-xs text-red-500">
                      {errors.usedParts[index]?.quantity?.message}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Complete Repair"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
