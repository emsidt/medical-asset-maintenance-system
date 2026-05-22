"use server";

import { getAuthHeaders, getAccessToken } from "@/lib/server-auth";
import { ApiResponse } from "@/types";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

/**
 * Đăng xuất: Gọi backend để revoke refresh token, sau đó NextAuth signOut
 * sẽ được gọi phía client (không thể gọi signOut() trong Server Action).
 * Trả về { success: true } để client biết cần gọi signOut().
 */
export async function logout() {
  // Best-effort: gọi backend để revoke refresh token
  try {
    const token = await getAccessToken();
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch {
    // Non-fatal: tiếp tục dù backend không phản hồi
  }

  return { success: true };
}

export async function changePassword(formData: unknown) {
  try {
    const authHeaders = await getAuthHeaders();

    if (!authHeaders.Authorization) {
      return { success: false, message: "Unauthorized: No session token found" };
    }

    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(formData),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const body = await response.text();
      return {
        success: false,
        message: `Backend returned ${response.status}: ${body.slice(0, 120)}`,
      };
    }

    const result: ApiResponse<string> = await response.json();
    if (response.ok) {
      return { success: true, message: result.message || "Password changed successfully" };
    }

    return {
      success: false,
      message:
        result.message || `Password change failed with status ${response.status}`,
    };
  } catch (error) {
    console.error("Change password server action error:", error);
    return {
      success: false,
      message: "Server connection failed: " + (error as Error).message,
    };
  }
}
