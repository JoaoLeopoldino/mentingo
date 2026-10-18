import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiClient } from "~/api/api-client";
import { queryClient } from "~/api/queryClient";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { useToast } from "~/components/ui/use-toast";

export function useRevokeCertificate() {
  const { t } = useTranslation();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ certificateId, reason }: { certificateId: string; reason: string }) => {
      const response = await ApiClient.api.certificatesControllerRevokeCertificate(certificateId, {
        reason,
      });
      return response.data.data;
    },
    onSuccess: () => {
      for (const key of [
        "certificate-learning-history",
        "certificates",
        "certificate",
        "course-certificate-rows",
        "certificate-dashboard-summary",
        "dashboard",
      ])
        void queryClient.invalidateQueries({ queryKey: [key] });
      toast({ description: t("certificateHistory.revoked") });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        description: getTranslatedApiErrorMessage(error, t, t("certificateHistory.failed")),
      }),
  });
}
