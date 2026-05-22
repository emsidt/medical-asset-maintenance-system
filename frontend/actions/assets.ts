"use server";

import { getAuthHeaders } from "@/lib/server-auth";
import { Asset, ApiResponse } from "@/types";
import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

/**
 * Server Action to report an asset failure.
 */
export async function reportAssetFailure(assetId: string | number, description: string, priority: string) {
  const authHeaders = await getAuthHeaders();

  if (!authHeaders.Authorization) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const response = await fetch(`${API_URL}/assets/${assetId}/report-failure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ description, priority }),
    });

    if (!response.ok) {
      return { success: false, message: `Failed with status ${response.status}` };
    }

    try {
      await response.json();
      revalidatePath("/assets");
      return { success: true };
    } catch {
      return { success: false, message: "Invalid response from server" };
    }
  } catch (error) {
    console.error("Report failure error:", error);
    return { success: false, message: "Server connection failed" };
  }
}

/**
 * Server Action to fetch all assets.
 */
export async function getAssets(): Promise<Asset[]> {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${API_URL}/assets`, {
      headers: { ...authHeaders },
      next: { revalidate: 0 },
    });

    if (!response.ok) throw new Error("Failed to fetch assets");

    const result: ApiResponse<Asset[]> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch assets from backend, using fallback mock data", error);
    return [];
  }
}

export async function createAsset(asset: Partial<Asset>) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/assets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(asset),
    });

    if (!response.ok) throw new Error("Failed to create asset");
    revalidatePath("/assets");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error creating asset" };
  }
}

export async function deleteAsset(id: number | string) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/assets/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders },
    });

    if (!response.ok) throw new Error("Failed to delete asset");
    revalidatePath("/assets");
    revalidatePath("/management/assets");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error deleting asset" };
  }
}

export async function updateAsset(id: number | string, asset: Partial<Asset>) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${API_URL}/assets/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(asset),
    });

    if (!response.ok) throw new Error("Failed to update asset");
    revalidatePath("/assets");
    revalidatePath("/management/assets");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error updating asset" };
  }
}
