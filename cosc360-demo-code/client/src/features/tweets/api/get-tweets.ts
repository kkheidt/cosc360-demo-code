import { apiClient } from "@/lib/api-client";
import type { TweetWithAuthor } from "../types";

export async function getTweetsApi(): Promise<TweetWithAuthor[]> {
  const res = await apiClient<TweetWithAuthor[]>("/api/tweets");
  return res.data!;
}
