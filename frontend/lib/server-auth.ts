import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Lấy accessToken từ NextAuth session (phía server). */
export async function getAccessToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { accessToken?: string } | undefined)?.accessToken ?? null;
}

/**
 * Trả về Authorization header đã gắn Bearer token.
 * Dùng trong mọi Server Action khi fetch API.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
