import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";

import { useRecoverOfflineAttempt } from "~/api/mutations/useRecoverOfflineAttempt";
import { Button } from "~/components/ui/button";

import type { OfflineOperation } from "./offline.types";
export function OfflineAttemptRecovery({ operation }: { operation: OfflineOperation }) {
  const { t } = useTranslation();
  const { mutateAsync: recover, isPending, isError } = useRecoverOfflineAttempt();
  const exportAnswers = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 1, attempt: operation }, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `offline-attempt-${operation.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="space-y-3 rounded border p-4" data-testid="offline-recovery">
      <h2 className="font-semibold">{t("offlineRecovery.title")}</h2>
      <p>
        {operation.id} · {t(`offlineQuiz.${operation.state}`)}
      </p>
      {operation.archivedAt && <p>{t("offlineRecovery.archived")}</p>}
      {operation.error && <p role="alert">{t(operation.error)}</p>}
      <details>
        <summary>{t("offlineRecovery.answers")}</summary>
        <ul>
          {operation.body.answers.map((answer) => {
            const question = operation.review?.questions.find(
              (item) => item.id === answer.questionId,
            );
            const option = question?.options.find((item) => item.id === answer.optionId);
            return (
              <li key={answer.questionId}>
                {question?.prompt || question?.title || answer.questionId}:{" "}
                {option?.label || answer.optionId}
              </li>
            );
          })}
        </ul>
        <p>{operation.body.clientSubmittedAt}</p>
      </details>
      <p>{t("offlineRecovery.exportWarning")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportAnswers}>
          {t("offlineRecovery.export")}
        </Button>
        {!operation.archivedAt && operation.state !== "synced" && (
          <Button
            disabled={isPending}
            onClick={() => void recover({ id: operation.id, action: "retry" }).catch(() => {})}
          >
            {t("offlineRecovery.retry")}
          </Button>
        )}
        {operation.failureStatus === 401 && (
          <Link className="underline" to="/auth/login">
            {t("offlineRecovery.login")}
          </Link>
        )}
        {!operation.archivedAt && operation.state === "failed" && (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => {
              if (window.confirm(t("offlineRecovery.archiveWarning")))
                void recover({ id: operation.id, action: "archive" }).catch(() => {});
            }}
          >
            {t("offlineRecovery.archive")}
          </Button>
        )}
        <Link className="underline" to={`/course/${operation.courseId}`}>
          {t("offlineRecovery.course")}
        </Link>
      </div>
      {isError && <p role="alert">{t("offline.error.storage")}</p>}
    </section>
  );
}
