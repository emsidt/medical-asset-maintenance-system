import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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

  const showShell = !!session;

  return (
    <html lang="vi">
      <body className={cn(inter.className, "bg-gray-50 min-h-screen")}>
        <AuthProvider>
          {showShell ? (
            <SocketProvider userRole={user?.role}>
              <div className="flex h-screen overflow-hidden">
                <Sidebar userRole={user?.role} />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <Header userName={user?.username} userRole={user?.role} />
                  <main className="flex-1 overflow-y-auto p-8">
                    {children}
                  </main>
                </div>
              </div>
            </SocketProvider>
          ) : (
            <main>{children}</main>
          )}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
