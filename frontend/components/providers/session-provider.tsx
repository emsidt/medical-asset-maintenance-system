"use client";

import { useEffect } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();

  useEffect(() => {
    // If NextAuth's refresh token rotation fails, it injects this error
    // We must catch it on the client side and force a logout
    if ((session as { error?: string })?.error === "RefreshAccessTokenError") {
      toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-blue-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Đang tải trạng thái đăng nhập...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <AuthGuard>{children}</AuthGuard>
    </SessionProvider>
  );
};
