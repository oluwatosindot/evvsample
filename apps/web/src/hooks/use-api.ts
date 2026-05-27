import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useApiQuery<T>(key: string[], path: string) {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery<{ data: T }>({
    queryKey: key,
    queryFn: () => apiClient<{ data: T }>(path, { token: token! }),
    enabled: !!token,
  });
}

export function useApiMutation<TInput, TResult = unknown>(
  path: string,
  options?: { method?: string; onSuccess?: () => void }
) {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  return useMutation<{ data: TResult }, Error, TInput>({
    mutationFn: (input) =>
      apiClient<{ data: TResult }>(path, {
        method: options?.method || "POST",
        body: JSON.stringify(input),
        token: token!,
      }),
    onSuccess: () => {
      options?.onSuccess?.();
      queryClient.invalidateQueries();
    },
  });
}
