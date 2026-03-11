import { apiClient } from "@/lib/api-client";
import type { User } from "../types";

export async function updateProfileApi(username: string): Promise<User> {
  const res = await apiClient<User>("/api/auth/profile", {
    method: "PUT",
    body: { username },
  });
  return res.data!;
}
