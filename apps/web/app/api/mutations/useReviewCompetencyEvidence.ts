import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useToast } from "~/components/ui/use-toast";

import { ApiClient } from "../api-client";
import { competencyWorkspaceKey } from "../queries/useCompetencyWorkspace";
import { queryClient } from "../queryClient";
import { getTranslatedApiErrorMessage } from "../utils/getTranslatedApiErrorMessage";
export function useReviewCompetencyEvidence() {
  const { t } = useTranslation();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (
      body: Parameters<typeof ApiClient.api.competenciesControllerReviewCompetencyEvidence>[0],
    ) => ApiClient.api.competenciesControllerReviewCompetencyEvidence(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: competencyWorkspaceKey });
      toast({ title: t("competencies.saved") });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: getTranslatedApiErrorMessage(error, t, t("competencies.errors.failed")),
      }),
  });
}
