import { apiClient } from "@/lib/api-client";
import type { Tweet } from "../types";

export async function updateTweetApi(
  id: string,
  content: string
): Promise<Tweet> {
  const res = await apiClient<Tweet>(`/api/tweets/${id}`, {
    method: "PATCH",
    body: { content },
  });
  return res.data!;
}
