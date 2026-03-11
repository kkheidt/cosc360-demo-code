import { apiClient } from "@/lib/api-client";
import type { User } from "../types";

export async function loginApi(username: string): Promise<User> {
  const res = await apiClient<User>("/api/auth/login", {
    method: "POST",
    body: { username },
  });
  return res.data!;
}
