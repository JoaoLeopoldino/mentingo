import { useMutation } from "@tanstack/react-query";

import { offlineQueue } from "~/modules/Offline/offline-queue";
import { getOfflineOwner } from "~/modules/Offline/offline-session";
import {
  OFFLINE_ATTEMPTS_KEY,
  OFFLINE_QUEUE_CHANGED,
} from "~/modules/Offline/useOfflineSynchronization";

import { queryClient } from "../queryClient";
export function useRecoverOfflineAttempt() {
  return useMutation({
    networkMode: "always",
    mutationFn: async ({ id, action }: { id: string; action: "retry" | "archive" }) => {
      const owner = getOfflineOwner();
      if (!owner) throw new Error("offline.error.session");
      return offlineQueue[action](owner, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: OFFLINE_ATTEMPTS_KEY });
      window.dispatchEvent(new Event(OFFLINE_QUEUE_CHANGED));
    },
  });
}
