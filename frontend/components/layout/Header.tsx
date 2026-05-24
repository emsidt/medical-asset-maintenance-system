"use client";

import { User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NotificationBell } from '../features/NotificationBell';

interface HeaderProps {
  userRole?: string;
  userName?: string;
}

export function Header({ userRole = 'STAFF', userName = 'Nhân viên' }: HeaderProps) {
  const [hospitalName, setHospitalName] = useState('Hệ thống Quản lý Thiết bị Y tế');

  const roleLabels: Record<string, string> = {
    ADMIN: "Quản trị viên",
    DOCTOR: "Bác sĩ",
    ENGINEER: "Kỹ sư",
    STAFF: "Nhân viên"
  };

  useEffect(() => {
    const handleStorageUpdate = () => {
      const saved = localStorage.getItem('system_hospital_name');
      if (saved) {
        setHospitalName(saved);
      }
    };
    handleStorageUpdate();
    window.addEventListener('system-hospital-name-updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('system-hospital-name-updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-8">
      <h1 className="text-lg font-semibold text-gray-800">{hospitalName}</h1>
      <div className="flex items-center gap-6">
        <NotificationBell />
        <div className="flex items-center gap-4">
          <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            {roleLabels[userRole.toUpperCase()] || userRole}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 border text-gray-600">
          <User className="h-6 w-6" />
        </div>
      </div>
      </div>
    </header>
  );
}
