"use server";

import { cookies } from "next/headers";
import { ApiResponse, AssetScore, DepartmentScore } from "@/types";

const API_URL = process.env.API_URL || "http://localhost:8080/api";

async function fetchAnalytics<T>(path: string): Promise<T[]> {
  const token = cookies().get("token")?.value;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}`);
    }

    const result: ApiResponse<T[]> = await response.json();
    return result.data;
  } catch (error) {
    console.warn("Could not fetch analytics data", error);
    return [];
  }
}

export async function getAssetScores(): Promise<AssetScore[]> {
  return fetchAnalytics<AssetScore>("/analytics/assets/scores");
}

export async function getDepartmentScores(): Promise<DepartmentScore[]> {
  return fetchAnalytics<DepartmentScore>("/analytics/departments/scores");
}
