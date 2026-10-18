import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "../api-client";
export const competencyFrameworkSetupKey = ["competency-framework-setup"] as const;
export function useCompetencyFrameworkSetup(enabled: boolean) {
  return useQuery({
    queryKey: competencyFrameworkSetupKey,
    enabled,
    queryFn: async () =>
      (await ApiClient.api.competenciesControllerGetCompetencyFrameworkSetup()).data.data,
  });
}
