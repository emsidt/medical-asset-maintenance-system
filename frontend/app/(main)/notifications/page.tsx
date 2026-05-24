"use client";

import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Tất cả thông báo
          </h1>
          <p className="text-slate-500 mt-1">Quản lý và xem lại toàn bộ lịch sử thông báo của bạn</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button 
            onClick={markAllAsRead} 
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-0"
            variant="outline"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Bell className="h-12 w-12 text-slate-200 mb-4" />
            <p className="text-lg font-medium text-slate-700">Chưa có thông báo nào</p>
            <p className="text-sm">Khi có sự kiện mới, thông báo sẽ hiển thị ở đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-6 transition-colors hover:bg-slate-50 flex gap-4 ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                onClick={() => {
                  if (!notification.isRead) markAsRead(notification.id);
                }}
              >
                <div className="mt-1">
                  {!notification.isRead ? (
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]"></div>
                  ) : (
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300"></div>
                  )}
                </div>
                <div className="flex-1 cursor-pointer">
                  <h3 className={`text-base ${!notification.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {notification.title}
                  </h3>
                  <p className={`mt-1 text-sm ${!notification.isRead ? 'text-slate-700' : 'text-slate-500'}`}>
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-slate-400 font-medium">
                    {new Date(notification.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
