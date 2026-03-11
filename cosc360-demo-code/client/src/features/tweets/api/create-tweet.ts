import { apiClient } from "@/lib/api-client";
import type { Tweet } from "../types";

export async function createTweetApi(content: string): Promise<Tweet> {
  const res = await apiClient<Tweet>("/api/tweets", {
    method: "POST",
    body: { content },
  });
  return res.data!;
}
