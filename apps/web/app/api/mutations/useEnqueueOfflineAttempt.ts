import { useMutation } from "@tanstack/react-query";

import { offlineQueue } from "~/modules/Offline/offline-queue";
import { getOfflineOwner } from "~/modules/Offline/offline-session";
import {
  OFFLINE_ATTEMPTS_KEY,
  OFFLINE_QUEUE_CHANGED,
} from "~/modules/Offline/useOfflineSynchronization";

import { queryClient } from "../queryClient";

import type { OfflineQuizSnapshot, OfflineSubmission } from "~/modules/Offline/offline.types";

export function useEnqueueOfflineAttempt() {
  return useMutation({
    networkMode: "always",
    retry: false,
    mutationFn: async ({
      quiz,
      answers,
    }: {
      quiz: OfflineQuizSnapshot;
      answers: OfflineSubmission["answers"];
    }) => {
      const owner = getOfflineOwner();
      if (!owner) throw new Error("offline.error.session");
      if (Date.now() >= Date.parse(quiz.expiresAt)) throw new Error("offlineQuiz.error.expired");
      return offlineQueue.enqueue(owner, quiz.courseId, quiz.lessonId, quiz.learningCycle, {
        clientAttemptId: crypto.randomUUID(),
        snapshot: quiz.snapshot,
        clientSubmittedAt: new Date().toISOString(),
        answers,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: OFFLINE_ATTEMPTS_KEY });
      window.dispatchEvent(new Event(OFFLINE_QUEUE_CHANGED));
    },
  });
}
