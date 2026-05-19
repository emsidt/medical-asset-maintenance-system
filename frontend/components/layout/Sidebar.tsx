"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Settings, LogOut, ClipboardList, BarChart3, User, Boxes, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/actions/auth';
import { toast } from 'sonner';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  userRole?: 'ADMIN' | 'DOCTOR' | 'NURSE' | 'ENGINEER' | 'MANAGER';
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  // Menu items lọc theo vai trò người dùng
  const allNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'ENGINEER', 'MANAGER'] },
    { name: 'Analytics', href: '/dashboard', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Assets & Reporting', href: '/assets', icon: Package, roles: ['ADMIN', 'DOCTOR', 'NURSE'] },
    { name: 'Repair Requests', href: '/repairs', icon: ClipboardList, roles: ['ADMIN', 'ENGINEER'] },
    { name: 'Inventory View', href: '/management/inventory', icon: Package, roles: ['ADMIN', 'MANAGER', 'ENGINEER'] },
    { name: 'Asset Management', href: '/management/assets', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Staff Management', href: '/management/staff', icon: User, roles: ['ADMIN'] },
    { name: 'Inventory', href: '/inventory', icon: Boxes, roles: ['ADMIN', 'ENGINEER'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['ADMIN', 'ENGINEER'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'ENGINEER', 'MANAGER'] },

  ];

  const filteredItems = allNavItems.filter(item =>
    !userRole || item.roles.includes(userRole)
  );

  const handleLogout = async () => {
    // 1. Xóa cookie cũ
    await logout();
    
    // 2. Đăng xuất khỏi NextAuth
    await signOut({ 
      callbackUrl: "/login",
      redirect: true 
    });
    
    toast.info("Logged out successfully");
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
                isActive 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
