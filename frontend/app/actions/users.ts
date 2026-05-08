"use server";

import { cookies } from "next/headers";
import { ApiResponse, User } from "@/types";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

export async function getUsers(): Promise<User[]> {
  const token = cookies().get("token")?.value;

  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      next: { revalidate: 0 }
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
  const token = cookies().get("token")?.value;

  try {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) throw new Error("Failed to fetch user");

    const result: ApiResponse<User> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch user from backend", error);
    return null;
  }
}
