'use client';

import { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/contexts/NotificationContext';

export function NotificationBell() {
    const router = useRouter();
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const handleMarkAllAsRead = async () => {
        setMarkingAll(true);
        await markAllAsRead();
        setMarkingAll(false);
    };

    // We only show top 10 in the bell
    const displayNotifications = notifications.slice(0, 10);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger render={
                <button className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none" />
            }>
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 min-w-[20px] h-[20px] text-[11px] font-bold text-white bg-red-500 border-2 border-white rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0 shadow-xl border-slate-100 rounded-xl overflow-hidden" align="end">
                <div className="flex items-center justify-between p-4 border-b bg-white">
                    <h4 className="font-semibold text-slate-800">Thông báo</h4>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-auto p-0 text-blue-600 hover:text-blue-700 hover:bg-transparent" 
                            onClick={handleMarkAllAsRead}
                            disabled={markingAll}
                        >
                            {markingAll ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                            Đánh dấu tất cả đã đọc
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px] bg-white">
                    {loading && displayNotifications.length === 0 ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                        </div>
                    ) : displayNotifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center">
                            <Bell className="h-8 w-8 text-slate-200 mb-2" />
                            Không có thông báo nào.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {displayNotifications.map((notification) => (
                                <div 
                                    key={notification.id} 
                                    className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                                    onClick={() => {
                                        if (!notification.isRead) markAsRead(notification.id);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <h5 className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                            {notification.title}
                                        </h5>
                                        {!notification.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5 shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"></span>
                                        )}
                                    </div>
                                    <p className={`text-sm mt-1 line-clamp-2 ${!notification.isRead ? 'text-slate-700' : 'text-slate-500'}`}>
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">
                                        {new Date(notification.createdAt).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t text-center bg-slate-50">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
                        onClick={() => {
                            setIsOpen(false);
                            router.push('/notifications');
                        }}
                    >
                        Xem tất cả
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
