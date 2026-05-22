"use server";

import { getAuthHeaders } from "@/lib/server-auth";
import {
  ApiResponse,
  Asset,
  AssetFinancial,
  DepartmentFinancial,
  FinancialSummary,
  InventoryItem,
} from "@/types";
import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

async function fetchFinance<T>(path: string): Promise<T | null> {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { ...authHeaders },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}`);
    }

    const result: ApiResponse<T> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch finance data", error);
    return null;
  }
}

export async function getFinancialSummary(): Promise<FinancialSummary | null> {
  return fetchFinance<FinancialSummary>("/finance/summary");
}

export async function getAssetFinancials(): Promise<AssetFinancial[]> {
  return (await fetchFinance<AssetFinancial[]>("/finance/assets")) ?? [];
}

export async function getDepartmentFinancials(): Promise<DepartmentFinancial[]> {
  return (await fetchFinance<DepartmentFinancial[]>("/finance/departments")) ?? [];
}

export async function updateAssetFinancials(
  assetId: string | number,
  payload: {
    purchasePrice?: number;
    replacementCost?: number;
    purchaseDate?: string;
    warrantyUntil?: string;
  }
) {
  const authHeaders = await getAuthHeaders();

  if (!authHeaders.Authorization) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const response = await fetch(`${API_URL}/finance/assets/${assetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    const result: ApiResponse<Asset> = await response.json();

    if (response.ok) {
      revalidatePath("/assets");
      revalidatePath("/analytics");
      return { success: true };
    }

    return { success: false, message: result.message || "Failed to update asset financials" };
  } catch (error) {
    console.error("Update asset financials error:", error);
    return { success: false, message: "Server connection failed" };
  }
}

export async function updateInventoryFinancials(
  inventoryId: string | number,
  payload: { unitCost?: number }
) {
  const authHeaders = await getAuthHeaders();

  if (!authHeaders.Authorization) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const response = await fetch(`${API_URL}/finance/inventory/${inventoryId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    const result: ApiResponse<InventoryItem> = await response.json();

    if (response.ok) {
      revalidatePath("/inventory");
      revalidatePath("/analytics");
      return { success: true };
    }

    return { success: false, message: result.message || "Failed to update inventory financials" };
  } catch (error) {
    console.error("Update inventory financials error:", error);
    return { success: false, message: "Server connection failed" };
  }
}
