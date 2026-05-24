'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NotificationDto } from '@/types';
import { getNotifications, getUnreadCount, markAsRead as markAsReadApi, markAllAsRead as markAllAsReadApi } from '@/actions/notifications';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';

interface NotificationContextType {
    notifications: NotificationDto[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchMore: (page: number, size: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<NotificationDto[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        const countRes = await getUnreadCount();
        if (countRes.success) {
            setUnreadCount(countRes.count);
        }

        // We fetch a generous amount initially to cover both the Bell and the Page
        const notifRes = await getNotifications(0, 50);
        if (notifRes.success && notifRes.data) {
            setNotifications(notifRes.data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useWebSocket((newNotification: NotificationDto) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        toast.info(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
        });
    });

    const markAsRead = async (id: number) => {
        const res = await markAsReadApi(id);
        if (res.success) {
            setNotifications((prev) => {
                const target = prev.find(n => n.id === id);
                if (target && !target.isRead) {
                    setUnreadCount(c => Math.max(0, c - 1));
                }
                return prev.map((n) => n.id === id ? { ...n, isRead: true } : n);
            });
        }
    };

    const markAllAsRead = async () => {
        const res = await markAllAsReadApi();
        if (res.success) {
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        }
    };

    // Allows the dedicated page to load older notifications if needed
    const fetchMore = async (page: number, size: number) => {
        const res = await getNotifications(page, size);
        if (res.success && res.data) {
            // Append without duplicating
            setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const newNotifs = res.data!.filter(n => !existingIds.has(n.id));
                return [...prev, ...newNotifs];
            });
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            markAsRead,
            markAllAsRead,
            fetchMore
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
