import { useQuery } from "@tanstack/react-query";

import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";

import { ApiClient } from "../api-client";
export const competencyWorkspaceKey = ["competency-workspace"] as const;
export function useCompetencyWorkspace() {
  const language = useLanguageStore((state) => state.language);
  return useQuery({
    queryKey: [...competencyWorkspaceKey, language],
    queryFn: async () =>
      (await ApiClient.api.competenciesControllerGetCompetencyWorkspace({ language })).data.data,
  });
}
