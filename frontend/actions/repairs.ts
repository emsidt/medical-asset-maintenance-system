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

    if (!response.ok) {
      console.error(`Failed to fetch service requests: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch service requests (Status: ${response.status})`);
    }
    
    const result: ApiResponse<ServiceRequest[]> = await response.json();
    return result.data;
  } catch (error) {
    console.error("Could not fetch service requests from backend:", error);
    // Mock data if backend endpoint doesn't exist yet
    return [];
  }

}

export async function completeRepair(
  requestId: string | number,
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

    if (!response.ok) {
      return { success: false, message: `Failed with status ${response.status}` };
    }

    try {
      await response.json();
      revalidatePath("/repairs");
      revalidatePath("/assets");
      return { success: true };
    } catch {
      return { success: false, message: "Invalid response from server" };
    }
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

export async function getMaintenanceSchedules(): Promise<import("@/types").MaintenanceSchedule[]> {
  const token = cookies().get("token")?.value;

  try {
    const response = await fetch(`${API_URL}/maintenance-schedules`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) throw new Error("Failed to fetch maintenance schedules");
    
    const result: ApiResponse<import("@/types").MaintenanceSchedule[]> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch maintenance schedules from backend", error);
    return [];
  }
}

export async function startMaintenance(requestId: string | number) {
  const token = cookies().get("token")?.value;

  try {
    const response = await fetch(`${API_URL}/service-requests/${requestId}/start`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
    });

    if (!response.ok) return { success: false, message: "Failed to start maintenance" };
    
    revalidatePath("/repairs");
    revalidatePath("/assets");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Start maintenance error:", error);
    return { success: false, message: "Connection failed" };
  }
}
