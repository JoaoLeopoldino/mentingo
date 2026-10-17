import { Link } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useDownloadOfflineCourse } from "~/api/mutations/useDownloadOfflineCourse";
import { Button } from "~/components/ui/button";

import type { SupportedLanguages } from "@repo/shared";

type OfflineDownloadButtonProps = { courseId: string; language: SupportedLanguages };
export function OfflineDownloadButton({ courseId, language }: OfflineDownloadButtonProps) {
  const { t } = useTranslation();
  const [result, setResult] = useState<string>();
  const { mutateAsync: downloadCourse, isPending } = useDownloadOfflineCourse();
  const download = async () => {
    setResult(undefined);
    try {
      await downloadCourse({ courseId, language });
      setResult("offline.ready");
    } catch (error) {
      const key = error instanceof Error ? error.message : "";
      setResult(key.startsWith("offline.error.") ? key : "offline.error.download");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => void download()}
        data-testid="offline-download"
      >
        {t(isPending ? "offline.downloading" : "offline.download")}
      </Button>
      <Link to="/offline-learning" className="text-sm underline">
        {t("offline.title")}
      </Link>
      {result && (
        <p role="status" className="text-sm">
          {t(result)}
        </p>
      )}
    </div>
  );
}
