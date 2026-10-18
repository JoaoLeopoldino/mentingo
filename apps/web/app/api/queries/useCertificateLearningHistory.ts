import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "../api-client";

export function useCertificateLearningHistory(userId: string, courseId: string) {
  return useQuery({
    queryKey: ["certificate-learning-history", userId, courseId],
    queryFn: async () => {
      const response = await ApiClient.api.certificatesControllerGetLearningHistory({
        userId,
        courseId,
      });
      return response.data.data;
    },
    enabled: Boolean(userId && courseId),
  });
}
