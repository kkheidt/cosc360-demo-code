import { apiClient } from "@/lib/api-client";

export async function deleteTweetApi(id: string): Promise<{ id: string }> {
  const res = await apiClient<{ id: string }>(`/api/tweets/${id}`, {
    method: "DELETE",
  });
  return res.data!;
}
