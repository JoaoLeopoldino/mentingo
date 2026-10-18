import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useToast } from "~/components/ui/use-toast";

import { ApiClient } from "../api-client";
import { competencyWorkspaceKey } from "../queries/useCompetencyWorkspace";
import { queryClient } from "../queryClient";
import { getTranslatedApiErrorMessage } from "../utils/getTranslatedApiErrorMessage";
export function useSetCompetencyActive() {
  const { t } = useTranslation();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: { id: string; active: boolean }) =>
      ApiClient.api.competenciesControllerSetCompetencyActive(body.id, { active: body.active }),
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
