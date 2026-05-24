import { Loader2, Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-blue-600">
        <div className="bg-blue-50 border border-blue-100/50 rounded-2xl p-3 w-fit shadow-sm">
          <Activity className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium text-gray-500 animate-pulse">
            Đang tải dữ liệu hệ thống...
          </p>
        </div>
      </div>
    </div>
  );
}
