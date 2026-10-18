import { Link, useParams } from "@remix-run/react";
import { PERMISSIONS, hasPermission } from "@repo/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRevokeCertificate } from "~/api/mutations/useRevokeCertificate";
import { useCertificateLearningHistory } from "~/api/queries/useCertificateLearningHistory";
import { useCurrentUser } from "~/api/queries/useCurrentUser";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";
import { formatLocalizedDate } from "~/utils/formatLocalizedDate";

export default function LearningHistoryPage() {
  const { courseId = "", userId = "" } = useParams();
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const { data: actor } = useCurrentUser();
  const { data, isPending, error } = useCertificateLearningHistory(userId, courseId);
  const { mutateAsync: revoke, isPending: revoking } = useRevokeCertificate();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const canRevoke = hasPermission(actor?.permissions ?? [], PERMISSIONS.COURSE_UPDATE);
  if (isPending)
    return (
      <PageWrapper>
        <p role="status">{t("studentCertificateView.informations.loading")}</p>
      </PageWrapper>
    );
  if (error || !data)
    return (
      <PageWrapper>
        <p role="alert">{t("certificateHistory.failed")}</p>
      </PageWrapper>
    );
  const cycles = [
    ...new Set([
      data.currentLearningCycle,
      ...data.certificates.map((c) => c.learningCycle),
      ...data.assessmentAttempts.map((a) => a.learningCycle),
      ...data.scormAttempts.map((a) => a.learningCycle),
    ]),
  ]
    .filter((cycle): cycle is number => cycle !== null)
    .sort((a, b) => b - a);
  return (
    <PageWrapper>
      <div
        className="mx-auto flex w-full max-w-4xl flex-col gap-6"
        data-testid="certificate-learning-history"
      >
        <div>
          <h1 className="h3">{t("certificateHistory.title")}</h1>
          <Link className="text-primary underline" to={`/course/${courseId}`}>
            {t("certificateHistory.back")}
          </Link>
        </div>
        {cycles.map((cycle) => (
          <section
            key={cycle}
            className="rounded-2xl border bg-white p-5"
            data-testid={`learning-cycle-${cycle}`}
          >
            <h2 className="h5 mb-4">{t("certificateHistory.cycle", { cycle })}</h2>
            {data.certificates
              .filter((c) => c.learningCycle === cycle)
              .map((certificate) => {
                const expired =
                  certificate.expiresAt && new Date(certificate.expiresAt).getTime() <= Date.now();
                let status = t("certificateHistory.active");
                if (expired) status = t("certificateHistory.expired");
                if (certificate.status === "archived")
                  status = t(`certificateHistory.reasons.${certificate.archiveReason}`, {
                    defaultValue: t("certificateHistory.archived"),
                  });
                return (
                  <article
                    key={certificate.id}
                    className="mb-4 rounded-lg border p-4"
                    data-testid={`historical-certificate-${certificate.id}`}
                  >
                    <p className="font-semibold">{status}</p>
                    <p>
                      {t("certificateHistory.issued")}:{" "}
                      {formatLocalizedDate(language, certificate.issuedAt)}
                    </p>
                    {certificate.expiresAt && (
                      <p>
                        {t("certificateHistory.expires")}:{" "}
                        {formatLocalizedDate(language, certificate.expiresAt)}
                      </p>
                    )}
                    {certificate.revocationReason && (
                      <p className="mt-2">{certificate.revocationReason}</p>
                    )}
                    {certificate.revokedBy && certificate.archivedAt && (
                      <p>
                        {t("certificateHistory.revokedBy")}:{" "}
                        {formatLocalizedDate(language, certificate.archivedAt)}
                      </p>
                    )}
                    {canRevoke && certificate.status === "active" && (
                      <form
                        className="mt-4 flex flex-col gap-3"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          if (!confirmed) return;
                          try {
                            await revoke({ certificateId: certificate.id, reason });
                            setReason("");
                            setConfirmed(false);
                          } catch {
                            /* Answers and reason remain visible on failure. */
                          }
                        }}
                      >
                        <label className="flex flex-col gap-1">
                          {t("certificateHistory.reason")}
                          <Textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            required
                            minLength={10}
                            maxLength={2000}
                            disabled={revoking}
                          />
                        </label>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(event) => setConfirmed(event.target.checked)}
                            disabled={revoking}
                            required
                          />
                          {t("certificateHistory.confirm")}
                        </label>
                        <Button
                          type="submit"
                          variant="destructive"
                          disabled={revoking || !confirmed || reason.trim().length < 10}
                        >
                          {t("certificateHistory.revocation")}
                        </Button>
                      </form>
                    )}
                  </article>
                );
              })}
            <h3 className="font-semibold">{t("certificateHistory.assessments")}</h3>
            <ul>
              {data.assessmentAttempts
                .filter((a) => a.learningCycle === cycle)
                .map((a) => (
                  <li key={a.id}>
                    {formatLocalizedDate(language, a.submittedAt)} · {a.scorePercentage ?? "—"}%
                  </li>
                ))}
            </ul>
            <h3 className="mt-3 font-semibold">{t("certificateHistory.scorm")}</h3>
            <ul>
              {data.scormAttempts
                .filter((a) => a.learningCycle === cycle)
                .map((a) => (
                  <li key={a.id}>
                    {a.attemptNumber} · {a.scoreRaw ?? "—"} ·{" "}
                    {a.completedAt ? formatLocalizedDate(language, a.completedAt) : "—"}
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {!cycles.length && <p>{t("certificateHistory.empty")}</p>}
      </div>
    </PageWrapper>
  );
}
