import type { ApiResponse } from "@/types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

export async function apiClient<T>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const userId: string | null = localStorage.getItem("userId");
  if (userId) {
    headers["X-User-Id"] = userId;
  }

  const response: Response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}
