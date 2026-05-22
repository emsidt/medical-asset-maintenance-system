"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Eye, EyeOff, User, Activity } from "lucide-react";
import { signIn, useSession } from "next-auth/react";

const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 w-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400 animate-pulse font-medium">Đang tải phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    const result = await signIn("credentials", {
      ...data,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Tên đăng nhập hoặc mật khẩu không chính xác.");
      setIsLoading(false);
      return;
    }

    toast.success("Đăng nhập thành công!");
    router.push("/");
    router.refresh();
    setIsLoading(false);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 relative overflow-hidden px-4">
      {/* Dynamic blurred mesh gradient background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/10 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-100 shadow-2xl shadow-blue-900/5 rounded-3xl p-8 md:p-10 relative z-10">
        
        {/* Header section with brand logo */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="bg-blue-50 border border-blue-100/50 rounded-2xl p-3 w-fit shadow-sm">
            <Activity className="h-7 w-7 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">MEDASSET</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Hệ Thống Quản Lý & Bảo Trì Thiết Bị Y Tế</p>
          </div>
        </div>

        {/* Login form fields */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-700 font-medium text-sm">Tên đăng nhập</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên tài khoản..."
                autoComplete="username"
                {...register("username")}
                className="pl-10 h-11 border-slate-200 focus-visible:ring-blue-500 focus-visible:border-blue-500 bg-slate-50/50 rounded-xl"
              />
            </div>
            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 font-medium text-sm">Mật khẩu</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu..."
                autoComplete="current-password"
                {...register("password")}
                className="pl-10 pr-10 h-11 border-slate-200 focus-visible:ring-blue-500 focus-visible:border-blue-500 bg-slate-50/50 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full h-11 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] rounded-xl" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang đăng nhập...</span>
              </div>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>

        {/* Footer section */}
        <div className="text-center text-xs text-slate-400 mt-8 border-t border-slate-100 pt-5">
          Hệ thống quản trị nội bộ dành cho nhân viên y tế
        </div>
      </div>
    </div>
  );
}
