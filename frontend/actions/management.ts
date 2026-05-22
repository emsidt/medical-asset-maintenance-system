"use server";

import { getAuthHeaders } from "@/lib/server-auth";
import { ApiResponse, InventoryItem, User } from "@/types";
import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

// --- Staff Management ---

export async function getStaff(): Promise<User[]> {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/staff`, {
      headers: { ...authHeaders },
      next: { revalidate: 0 },
    });
    if (!response.ok) throw new Error("Failed to fetch staff");
    const result: ApiResponse<User[]> = await response.json();
    return result.data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createStaff(staff: Partial<User> & { password?: string }) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(staff),
    });
    if (!response.ok) throw new Error("Failed to create staff");
    revalidatePath("/management/staff");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error creating staff member" };
  }
}

export async function deleteStaff(id: number) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/staff/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders },
    });
    if (!response.ok) throw new Error("Failed to delete staff");
    revalidatePath("/management/staff");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error deleting staff member" };
  }
}

export async function updateStaff(id: number, staff: Partial<User> & { password?: string }) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/staff/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(staff),
    });
    if (!response.ok) throw new Error("Failed to update staff");
    revalidatePath("/management/staff");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error updating staff member" };
  }
}

// --- Inventory Management ---

export async function createInventoryItem(item: Partial<InventoryItem>) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error("Failed to create inventory item");
    revalidatePath("/repairs");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error creating inventory item" };
  }
}

export async function deleteInventoryItem(id: number) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders },
    });
    if (!response.ok) throw new Error("Failed to delete inventory item");
    revalidatePath("/repairs");
    revalidatePath("/management/inventory");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error deleting inventory item" };
  }
}

export async function updateInventoryItem(id: number, item: Partial<InventoryItem>) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error("Failed to update inventory item");
    revalidatePath("/repairs");
    revalidatePath("/management/inventory");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error updating inventory item" };
  }
}
