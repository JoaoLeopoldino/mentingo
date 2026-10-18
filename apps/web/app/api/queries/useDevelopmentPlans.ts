import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "../api-client";
export const developmentPlansKey = ["competency-development-plans"] as const;
export function useDevelopmentPlans(userId?: string) {
  return useQuery({
    enabled: Boolean(userId),
    queryKey: [...developmentPlansKey, userId],
    queryFn: async () =>
      (await ApiClient.api.competenciesControllerGetDevelopmentPlans({ userId })).data.data,
  });
}
