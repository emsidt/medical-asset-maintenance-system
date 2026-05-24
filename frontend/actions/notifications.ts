'use server';

import { NotificationDto } from '@/types';
import { getAuthHeaders } from '@/lib/server-auth';

const API_URL = process.env.API_URL || "http://localhost:8080/api";

export async function getNotifications(page = 0, size = 10) {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_URL}/notifications?page=${page}&size=${size}`, {
            headers: { ...authHeaders },
            next: { revalidate: 0 },
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const json = await response.json();
        
        return {
            success: true,
            data: json.data?.content as NotificationDto[],
            totalPages: json.data?.totalPages as number,
        };
    } catch (error) {
        console.error('Failed to get notifications:', error);
        return { success: false, error: 'Failed to load notifications' };
    }
}

export async function getUnreadCount() {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
            headers: { ...authHeaders },
            next: { revalidate: 0 },
        });
        if (!response.ok) throw new Error('Failed to fetch unread count');
        const json = await response.json();
        
        return {
            success: true,
            count: json.data as number,
        };
    } catch (error) {
        console.error('Failed to get unread count:', error);
        return { success: false, count: 0 };
    }
}

export async function markAsRead(id: number) {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'PUT',
            headers: { ...authHeaders },
        });
        if (!response.ok) throw new Error('Failed to mark as read');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark as read:', error);
        return { success: false };
    }
}

export async function markAllAsRead() {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_URL}/notifications/read-all`, {
            method: 'PUT',
            headers: { ...authHeaders },
        });
        if (!response.ok) throw new Error('Failed to mark all as read');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark all as read:', error);
        return { success: false };
    }
}
