"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Boxes, LayoutDashboard, Package, Settings, LogOut, ClipboardList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/app/actions/auth';
import { toast } from 'sonner';

interface SidebarProps {
  userRole?: 'ADMIN' | 'DOCTOR' | 'ENGINEER';
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Define menu items and filter based on role
  const allNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'ENGINEER'] },
    { name: 'My Assets', href: '/assets', icon: Package, roles: ['ADMIN', 'DOCTOR'] },
    { name: 'Repair Requests', href: '/repairs', icon: ClipboardList, roles: ['ADMIN', 'ENGINEER'] },
    { name: 'Inventory', href: '/inventory', icon: Boxes, roles: ['ADMIN', 'ENGINEER'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'DOCTOR', 'ENGINEER'] },

  ];

  const filteredItems = allNavItems.filter(item => 
    !userRole || item.roles.includes(userRole)
  );

  const handleLogout = async () => {
    await logout();
    toast.info("Logged out");
    router.push("/login");
    router.refresh();
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
