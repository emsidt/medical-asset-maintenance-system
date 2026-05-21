"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { reportAssetFailure } from "@/actions/assets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";

const formSchema = z.object({
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
}).superRefine((data, ctx) => {
  if (data.priority === "CRITICAL" && data.description.length < 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CRITICAL priority requires detailed reason (>20 characters).",
      path: ["description"],
    });
  }
});

interface ReportFailureFormProps {
  assetId: string | number;
  assetName: string;
  onSuccess?: () => void;
}

export function ReportFailureForm({ assetId, assetName, onSuccess }: ReportFailureFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      priority: "LOW",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const result = await reportAssetFailure(assetId, values.description, values.priority);
      
      if (result.success) {
        toast.success("Failure reported successfully");
        setOpen(false);
        form.reset();
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.message || "Failed to report failure. Please try again.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Report Failure
          </Button>
        }
      />


      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Equipment Failure</DialogTitle>
          <DialogDescription>
            Reporting an issue for <strong>{assetName}</strong>. This will notify the maintenance team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description of the issue</Label>
            <Textarea
              id="description"
              placeholder="Please describe what happened..."
              className="min-h-[100px]"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("priority")}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
