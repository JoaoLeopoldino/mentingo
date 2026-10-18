import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useRecordCompetencyAssessment } from "~/api/mutations/useRecordCompetencyAssessment";
import { useReviewCompetencyEvidence } from "~/api/mutations/useReviewCompetencyEvidence";
import { useRevokeCompetencyAssessment } from "~/api/mutations/useRevokeCompetencyAssessment";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";
import { formatLocalizedDate } from "~/utils/formatLocalizedDate";

import { BusyForm, Field, Picker, optionalDate, value } from "./competency-controls";

import type { GetCompetencyWorkspaceResponse } from "~/api/generated-api";

export function CompetencyAssessmentPanel({
  data,
  employeeId,
  canAssess,
}: {
  data: GetCompetencyWorkspaceResponse["data"];
  employeeId: string;
  canAssess: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const [competencyId, setCompetencyId] = useState("");
  const { mutateAsync: assess, isPending: assessing } = useRecordCompetencyAssessment();
  const { mutateAsync: review, isPending: reviewing } = useReviewCompetencyEvidence();
  const { mutateAsync: revoke, isPending: revoking } = useRevokeCompetencyAssessment();
  const busy = assessing || reviewing || revoking;
  const records = data.assessments.filter((x) => x.userId === employeeId);
  const current = records.find((x) => x.competencyId === competencyId);
  const proof = data.evidence.filter((x) => x.userId === employeeId);
  const name = (id: string) => data.catalog.find((x) => x.id === id)?.name ?? id;
  const submit =
    (action: (form: FormData) => Promise<unknown>) => (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      void action(new FormData(form))
        .then(() => form.reset())
        .catch(() => {});
    };
  const allowedProof = proof.filter(
    (x) =>
      x.competencyId === competencyId &&
      (data.evidenceReviews.find((r) => r.evidenceId === x.id)?.status ?? x.status) === "approved",
  );
  return (
    <section className="space-y-4" data-testid="competency-assessment-panel">
      <h2 className="text-xl font-semibold">{t("competencies.enterprise.formalAssessments")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("competencies.enterprise.separationNotice")}
      </p>
      {records.map((item) => (
        <article
          key={item.id}
          className="rounded border p-3"
          data-testid="competency-formal-assessment"
        >
          <h3 className="font-semibold">
            {name(item.competencyId)} · {t("competencies.level")} {item.level} ·{" "}
            {t("competencies.enterprise.revision")} {item.revision}
          </h3>
          <p>{item.rationale}</p>
          <p>
            {t("competencies.assessor")}:{" "}
            {data.employees.find((x) => x.id === item.assessorId)?.name ?? item.assessorId} ·{" "}
            {formatLocalizedDate(language, item.assessedAt)}
          </p>
          {item.expiresAt && (
            <p>
              {t("competencies.expiry")}: {formatLocalizedDate(language, item.expiresAt)}
            </p>
          )}
          {data.revocations
            .filter((x) => x.assessmentId === item.id)
            .map((restriction) => (
              <p key={restriction.id} className="font-medium">
                {t(`competencies.states.${restriction.kind}`)}: {restriction.reason} ·{" "}
                {formatLocalizedDate(language, restriction.effectiveAt)}
              </p>
            ))}
        </article>
      ))}
      {canAssess && (
        <div className="grid gap-4 xl:grid-cols-2">
          <BusyForm
            busy={busy}
            className="grid gap-3 rounded border p-4"
            data-testid="competency-review-form"
            onSubmit={submit((d) =>
              review({
                evidenceId: value(d, "evidenceId"),
                status: value(d, "reviewStatus") as "approved" | "rejected",
                rationale: value(d, "rationale"),
              }),
            )}
          >
            <h3 className="font-semibold">{t("competencies.enterprise.reviewEvidence")}</h3>
            <Picker
              name="evidenceId"
              label={t("competencies.evidence")}
              options={proof.map((x) => ({
                id: x.id,
                name: `${name(x.competencyId)} — ${x.source}: ${x.evidence.slice(0, 80)}`,
              }))}
            />
            <Field label={t("competencies.status")}>
              <select
                aria-label={t("competencies.status")}
                name="reviewStatus"
                className="h-10 w-full min-w-0 max-w-full rounded border bg-background px-3"
              >
                <option value="approved">
                  {t("competencies.enterprise.reviewStates.approved")}
                </option>
                <option value="rejected">
                  {t("competencies.enterprise.reviewStates.rejected")}
                </option>
              </select>
            </Field>
            <Field label={t("competencies.enterprise.rationale")}>
              <Textarea name="rationale" maxLength={4000} required />
            </Field>
            <Button type="submit">{t("competencies.save")}</Button>
          </BusyForm>
          <BusyForm
            busy={busy}
            className="grid gap-3 rounded border p-4"
            data-testid="competency-assessment-form"
            onSubmit={submit((d) =>
              assess({
                id: crypto.randomUUID(),
                userId: employeeId,
                competencyId,
                level: Number(value(d, "level")),
                expectedAssessmentId: current?.id ?? null,
                sourceEvidenceId: value(d, "sourceEvidenceId") || null,
                rationale: value(d, "rationale"),
                expiresAt: optionalDate(d, "expiresAt"),
                reviewAt: optionalDate(d, "reviewAt"),
              }),
            )}
          >
            <h3 className="font-semibold">{t("competencies.enterprise.recordAssessment")}</h3>
            <Field label={t("competencies.competency")}>
              <select
                aria-label={t("competencies.competency")}
                name="competencyId"
                value={competencyId}
                required
                className="h-10 w-full min-w-0 max-w-full rounded border bg-background px-3"
                onChange={(event) => setCompetencyId(event.target.value)}
              >
                <option value="">—</option>
                {data.catalog
                  .filter((x) => x.active)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={t("competencies.level")}>
              <Input name="level" type="number" min={1} max={20} required />
            </Field>
            <Picker
              name="sourceEvidenceId"
              label={t("competencies.enterprise.acceptedEvidence")}
              optional
              options={allowedProof.map((x) => ({
                id: x.id,
                name: `${x.source}: ${x.evidence.slice(0, 80)}`,
              }))}
            />
            <Field label={t("competencies.enterprise.rationale")}>
              <Textarea name="rationale" maxLength={4000} required />
            </Field>
            <Field label={t("competencies.expiry")}>
              <Input name="expiresAt" type="datetime-local" />
            </Field>
            <Field label={t("competencies.review")}>
              <Input name="reviewAt" type="datetime-local" />
            </Field>
            <Button type="submit">{t("competencies.enterprise.recordAssessment")}</Button>
          </BusyForm>
          <BusyForm
            busy={busy}
            className="grid gap-3 rounded border p-4"
            data-testid="competency-revocation-form"
            onSubmit={submit((d) =>
              revoke({
                id: crypto.randomUUID(),
                assessmentId: value(d, "assessmentId"),
                kind: value(d, "kind") as "revoked" | "suspended",
                reason: value(d, "reason"),
                effectiveAt: optionalDate(d, "effectiveAt") ?? new Date().toISOString(),
                endsAt: optionalDate(d, "endsAt"),
              }),
            )}
          >
            <h3 className="font-semibold">{t("competencies.enterprise.restrictAssessment")}</h3>
            <Picker
              name="assessmentId"
              label={t("competencies.enterprise.currentAssessment")}
              options={records
                .filter((x, i) => records.findIndex((r) => r.competencyId === x.competencyId) === i)
                .map((x) => ({ id: x.id, name: `${name(x.competencyId)} · ${x.level}` }))}
            />
            <Field label={t("competencies.status")}>
              <select
                aria-label={t("competencies.status")}
                name="kind"
                className="h-10 w-full min-w-0 max-w-full rounded border bg-background px-3"
              >
                <option value="revoked">{t("competencies.states.revoked")}</option>
                <option value="suspended">{t("competencies.states.suspended")}</option>
              </select>
            </Field>
            <Field label={t("competencies.enterprise.reason")}>
              <Textarea name="reason" required maxLength={4000} />
            </Field>
            <Field label={t("competencies.enterprise.effectiveAt")}>
              <Input name="effectiveAt" type="datetime-local" />
            </Field>
            <Field label={t("competencies.enterprise.suspensionUntil")}>
              <Input name="endsAt" type="datetime-local" />
            </Field>
            <Button type="submit" variant="destructive">
              {t("competencies.enterprise.restrictAssessment")}
            </Button>
          </BusyForm>
        </div>
      )}
    </section>
  );
}
