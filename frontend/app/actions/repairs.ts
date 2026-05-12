"use server";

import { cookies } from "next/headers";
import { ApiResponse, ServiceRequest, InventoryItem } from "@/types";
import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

export async function getServiceRequests(): Promise<ServiceRequest[]> {
  const token = cookies().get("token")?.value;

  try {
    const response = await fetch(`${API_URL}/service-requests`, {
      headers: {

        "Authorization": `Bearer ${token}`
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) throw new Error("Failed to fetch service requests");
    
    const result: ApiResponse<ServiceRequest[]> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch service requests from backend, using fallback mock data", error);
    // Mock data if backend endpoint doesn't exist yet
    return [];
  }
}

export async function completeRepair(
  requestId: string,
  resolutionDetails: string,
  usedParts: { partId: number, quantity: number }[],
  laborCost?: number
) {
  const token = cookies().get("token")?.value;

  if (!token) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const response = await fetch(`${API_URL}/service-requests/${requestId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ resolutionDetails, usedParts, laborCost }),
    });

    const result: ApiResponse<any> = await response.json();

    if (response.ok) {
      revalidatePath("/repairs");
      revalidatePath("/assets");
      return { success: true };
    }

    return { success: false, message: result.message || "Failed to complete repair" };
  } catch (error) {
    console.error("Complete repair error:", error);
    return { success: false, message: "Server connection failed" };
  }
}

export async function assignRepair(requestId: string, engineerId: string | number) {
  const token = cookies().get("token")?.value;

  if (!token) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const response = await fetch(`${API_URL}/service-requests/${requestId}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ engineerId }),
    });

    const result: ApiResponse<ServiceRequest> = await response.json();

    if (response.ok) {
      revalidatePath("/repairs");
      revalidatePath("/assets");
      revalidatePath("/analytics");
      return { success: true };
    }

    return { success: false, message: result.message || "Failed to assign repair" };
  } catch (error) {
    console.error("Assign repair error:", error);
    return { success: false, message: "Server connection failed" };
  }
}

export async function getInventory(): Promise<InventoryItem[]> {
  const token = cookies().get("token")?.value;

  try {
    const response = await fetch(`${API_URL}/inventory`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) throw new Error("Failed to fetch inventory");
    
    const result: ApiResponse<InventoryItem[]> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch inventory from backend, using fallback mock data", error);
    return [];

  }
}
