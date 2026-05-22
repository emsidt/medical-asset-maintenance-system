"use server";

import { getAuthHeaders } from "@/lib/server-auth";
import { ApiResponse, User } from "@/types";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

export async function getUsers(): Promise<User[]> {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: { ...authHeaders },
      next: { revalidate: 0 },
    });

    if (!response.ok) throw new Error("Failed to fetch users");

    const result: ApiResponse<User[]> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch users from backend", error);
    return [];
  }
}

export async function getUser(userId: string | number): Promise<User | null> {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      headers: { ...authHeaders },
      next: { revalidate: 0 },
    });

    if (!response.ok) throw new Error("Failed to fetch user");

    const result: ApiResponse<User> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch user from backend", error);
    return null;
  }
}
