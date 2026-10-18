import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useToast } from "~/components/ui/use-toast";

import { ApiClient } from "../api-client";
import { competencyWorkspaceKey } from "../queries/useCompetencyWorkspace";
import { developmentPlansKey } from "../queries/useDevelopmentPlans";
import { queryClient } from "../queryClient";
import { getTranslatedApiErrorMessage } from "../utils/getTranslatedApiErrorMessage";
export function useCreateDevelopmentPlan() {
  const { t } = useTranslation();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (
      body: Parameters<typeof ApiClient.api.competenciesControllerCreateDevelopmentPlan>[0],
    ) => ApiClient.api.competenciesControllerCreateDevelopmentPlan(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: competencyWorkspaceKey }),
        queryClient.invalidateQueries({ queryKey: developmentPlansKey }),
      ]);
      toast({ title: t("competencies.saved") });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: getTranslatedApiErrorMessage(error, t, t("competencies.errors.failed")),
      }),
  });
}
