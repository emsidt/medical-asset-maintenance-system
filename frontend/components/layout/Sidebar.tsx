"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userRole?: "ADMIN" | "DOCTOR" | "ENGINEER";
}

type UserRole = NonNullable<SidebarProps["userRole"]>;

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const allNavItems: NavItem[] = [
  { name: "Trang chủ", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "DOCTOR", "ENGINEER"] },
  { name: "Thống kê tổng quan", href: "/dashboard", icon: BarChart3, roles: ["ADMIN"] },
  { name: "Yêu cầu sửa chữa & Thiết bị", href: "/assets", icon: Package, roles: ["ADMIN", "DOCTOR"] },
  { name: "Xử lý sửa chữa", href: "/repairs", icon: ClipboardList, roles: ["ADMIN", "ENGINEER"] },
  { name: "Bảo trì định kỳ", href: "/maintenance", icon: Wrench, roles: ["ADMIN", "ENGINEER"] },
  { name: "Kho & Linh kiện", href: "/management/inventory", icon: Package, roles: ["ADMIN"] },
  { name: "Quản lý thiết bị", href: "/management/assets", icon: Settings, roles: ["ADMIN"] },
  { name: "Quản lý nhân sự", href: "/management/staff", icon: User, roles: ["ADMIN"] },
  { name: "Quản lý kho", href: "/inventory", icon: Boxes, roles: ["ADMIN", "ENGINEER"] },
  { name: "Báo cáo hiệu suất", href: "/analytics", icon: BarChart3, roles: ["ADMIN", "ENGINEER"] },
  { name: "Chatbot RAG", href: "/rag-chat", icon: Bot, roles: ["ADMIN", "DOCTOR", "ENGINEER"] },
  { name: "Tài khoản hệ thống", href: "/users", icon: Users, roles: ["ADMIN"] },
  { name: "Cài đặt", href: "/settings", icon: Settings, roles: ["ADMIN", "DOCTOR", "ENGINEER"] },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = allNavItems.filter((item) => !userRole || item.roles.includes(userRole));

  const handleLogout = async () => {
    await logout();
    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });

    toast.info("Đăng xuất thành công");
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold text-blue-600">MedAsset</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
