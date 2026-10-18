import { useQuery } from "@tanstack/react-query";

import { offlineQueue } from "~/modules/Offline/offline-queue";
import { OFFLINE_ATTEMPTS_KEY } from "~/modules/Offline/useOfflineSynchronization";

export function useOfflineAttempts(owner: string | undefined) {
  return useQuery({
    queryKey: [...OFFLINE_ATTEMPTS_KEY, owner],
    queryFn: () => (owner ? offlineQueue.list(owner) : []),
    networkMode: "always",
    retry: false,
    refetchInterval: 2000,
  });
}
