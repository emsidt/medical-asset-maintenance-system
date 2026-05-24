import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/session-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedAsset | Quản lý thiết bị y tế",
  description: "Hệ thống quản lý bảo trì và thiết bị y tế bệnh viện",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  const user = session?.user
    ? {
        username: session.user.name || session.user.email || undefined,
        role: (session.user as { role: 'ADMIN' | 'DOCTOR' | 'ENGINEER' }).role,
      }
    : null;

  return (
    <html lang="vi">
      <body className={cn(inter.className, "bg-gray-50 min-h-screen")}>
        <AuthProvider>
          <SocketProvider userRole={user?.role}>
            {children}
            <Toaster position="top-right" richColors duration={5000} closeButton />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
