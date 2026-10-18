import { useQuery } from "@tanstack/react-query";

import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";

import { ApiClient } from "../api-client";

import type { CompetencyWorkspaceQuery } from "./competency-workspace.types";
export const competencyWorkspaceKey = ["competency-workspace"] as const;
export function useCompetencyWorkspace(filters: CompetencyWorkspaceQuery = {}) {
  const language = useLanguageStore((state) => state.language);
  return useQuery({
    queryKey: [...competencyWorkspaceKey, language, filters],
    queryFn: async () =>
      (await ApiClient.api.competenciesControllerGetCompetencyWorkspace({ ...filters, language }))
        .data.data,
  });
}
