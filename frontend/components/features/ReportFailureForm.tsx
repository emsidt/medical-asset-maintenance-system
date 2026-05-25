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
    message: "Mô tả chi tiết phải chứa ít nhất 10 ký tự.",
  }),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
}).superRefine((data, ctx) => {
  if (data.priority === "CRITICAL" && data.description.length < 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Độ ưu tiên KHẨN CẤP yêu cầu lý do chi tiết hơn (ít nhất 20 ký tự).",
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
        toast.success("Báo cáo sự cố thành công!");
        setOpen(false);
        form.reset();
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.message || "Gửi báo cáo sự cố thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi không mong muốn.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" className="gap-2 w-36">
            <AlertCircle className="h-4 w-4" />
            Báo cáo sự cố
          </Button>
        }
      />


      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Báo cáo sự cố thiết bị</DialogTitle>
          <DialogDescription>
            Đang báo cáo sự cố cho thiết bị <strong>{assetName}</strong>. Yêu cầu này sẽ được gửi trực tiếp tới đội kỹ sư bảo trì.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả chi tiết sự cố</Label>
            <Textarea
              id="description"
              placeholder="Vui lòng nhập chi tiết sự cố xảy ra..."
              className="min-h-[100px]"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Mức độ ưu tiên</Label>
            <select
              id="priority"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("priority")}
            >
              <option value="LOW">Thấp (Low)</option>
              <option value="MEDIUM">Trung bình (Medium)</option>
              <option value="HIGH">Cao (High)</option>
              <option value="CRITICAL">Khẩn cấp (Critical)</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gửi báo cáo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
