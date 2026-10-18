import { useEffect } from "react";

import { ApiClient } from "~/api/api-client";
import { COURSE_VIEW_QUERY_KEY } from "~/api/queries/useCourse";
import { ALL_COURSES_QUERY_KEY } from "~/api/queries/useCourses";
import { queryClient } from "~/api/queryClient";

import { offlineQueue } from "./offline-queue";
import { getOfflineOwner } from "./offline-session";

export const OFFLINE_ATTEMPTS_KEY = ["offline-attempts"];
export const OFFLINE_QUEUE_CHANGED = "mentingo:offline-queue-changed";
export function useOfflineSynchronization() {
  useEffect(() => {
    let running = false;
    let stopped = false;
    const sync = async () => {
      const owner = getOfflineOwner();
      if (running || stopped || !owner || !navigator.onLine) return;
      running = true;
      try {
        await offlineQueue.sync(
          owner,
          async (body) => {
            const response = await ApiClient.api.offlineAssessmentControllerSubmitOfflineAssessment(
              body,
              {
                timeout: 15000,
              },
            );
            void queryClient.invalidateQueries({ queryKey: COURSE_VIEW_QUERY_KEY });
            void queryClient.invalidateQueries({ queryKey: ALL_COURSES_QUERY_KEY });
            void queryClient.invalidateQueries({ queryKey: ["lesson"] });
            return response.data.data;
          },
          () => !stopped && getOfflineOwner() === owner,
        );
        await queryClient.invalidateQueries({ queryKey: OFFLINE_ATTEMPTS_KEY });
      } catch {
        // IndexedDB failures are surfaced by the local query; keep this foreground loop alive.
      } finally {
        running = false;
      }
    };
    void sync();
    const interval = window.setInterval(() => void sync(), 10000);
    const onChange = () => void sync();
    window.addEventListener("online", onChange);
    window.addEventListener(OFFLINE_QUEUE_CHANGED, onChange);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("online", onChange);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED, onChange);
    };
  }, []);
}
