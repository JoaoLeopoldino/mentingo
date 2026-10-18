import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useToast } from "~/components/ui/use-toast";

import { ApiClient } from "../api-client";
import { competencyFrameworkSetupKey } from "../queries/useCompetencyFrameworkSetup";
import { queryClient } from "../queryClient";
import { getTranslatedApiErrorMessage } from "../utils/getTranslatedApiErrorMessage";
export function useCreateCompetencyScale() {
  const { t } = useTranslation();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (
      body: Parameters<typeof ApiClient.api.competenciesControllerCreateCompetencyScale>[0],
    ) => ApiClient.api.competenciesControllerCreateCompetencyScale(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: competencyFrameworkSetupKey });
      toast({ title: t("competencies.saved") });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: getTranslatedApiErrorMessage(error, t, t("competencies.errors.failed")),
      }),
  });
}
