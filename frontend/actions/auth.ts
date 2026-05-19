"use server";

import { cookies } from "next/headers";
import { AuthResponse, ApiResponse } from "@/types";

const API_URL = process.env.API_URL || "http://localhost:8080/api";


export async function login(formData: unknown) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",

      headers: { "Content-Type": "application/json" },
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

    const result: ApiResponse<AuthResponse> = await response.json();
    console.log("Login API result:", result);

    if (response.ok && result.data && result.data.token) {
      // Store token and user info in cookies
      cookies().set("token", result.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 day
        path: "/",
      });

      cookies().set("user", JSON.stringify({
        username: result.data.username,
        role: result.data.role
      }), {
        httpOnly: false, // Accessible by client to show user info
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });

      return { success: true };
    }

    return {
      success: false,
      message: result.message || `Login failed with status ${response.status}`
    };
  } catch (error) {
    console.error("Login server action error:", error);
    return { success: false, message: "Server connection failed: " + (error as Error).message };
  }

}

export async function logout() {
  cookies().delete("token");
  cookies().delete("user");
}
