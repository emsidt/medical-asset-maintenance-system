"use server";

import { getAuthHeaders } from "@/lib/server-auth";
import { ApiResponse, DashboardStats } from "@/types";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

/**
 * Server Action: Lấy thống kê tổng hợp cho Dashboard Manager.
 * Gọi GET /api/dashboard/stats
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${API_URL}/dashboard/stats`, {
      headers: { ...authHeaders },
      next: { revalidate: 0 }, // Luôn lấy dữ liệu mới nhất
    });

    if (!response.ok) throw new Error("Failed to fetch dashboard stats");

    const result: ApiResponse<DashboardStats> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch dashboard stats from backend", error);
    // Fallback mock data để tránh crash UI khi backend chưa kết nối
    return {
      assetStats: {
        available: 0,
        broken: 0,
        underMaintenance: 0,
        maintenanceDue: 0,
        total: 0,
      },
      lowStockAlerts: [],
    };
  }
}
