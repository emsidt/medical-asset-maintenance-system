"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md border-red-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-4">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Truy cập bị từ chối</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            Bạn không có quyền truy cập vào trang này. 
            Vui lòng liên hệ với quản trị viên nếu bạn nghĩ đây là một sự nhầm lẫn.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-3">
            <Link 
              href="/" 
              className={cn(
                buttonVariants({ variant: "default" }), 
                "w-full bg-blue-600 hover:bg-blue-700 h-10 flex items-center justify-center"
              )}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại Trang chủ
            </Link>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Hoặc</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                await logout();
                await signOut({ callbackUrl: "/login" });
              }}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Đăng nhập bằng tài khoản khác
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
