import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationProvider } from "@/contexts/NotificationContext";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = {
    username: session.user?.name || session.user?.email || undefined,
    role: (session.user as { role: 'ADMIN' | 'DOCTOR' | 'ENGINEER' }).role,
  };

  return (
    <NotificationProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar userRole={user.role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header userName={user.username} userRole={user.role} />
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
