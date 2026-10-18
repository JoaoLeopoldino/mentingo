import { useTranslation } from "react-i18next";

import { useCreateCompetencyJobAssignment } from "~/api/mutations/useCreateCompetencyJobAssignment";
import { useEndCompetencyJobAssignment } from "~/api/mutations/useEndCompetencyJobAssignment";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";
import { formatLocalizedDate } from "~/utils/formatLocalizedDate";

import { BusyForm, Field, Picker, value, optionalDate } from "./competency-controls";

import type {
  GetCompetencyWorkspaceResponse,
  GetCompetencyFrameworkSetupResponse,
} from "~/api/generated-api";
export function JobAssignmentsPanel({
  data,
  setup,
  employeeId,
}: {
  data: GetCompetencyWorkspaceResponse["data"];
  setup: GetCompetencyFrameworkSetupResponse["data"] | undefined;
  employeeId: string;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const { mutateAsync: create, isPending: creating } = useCreateCompetencyJobAssignment();
  const { mutateAsync: end, isPending: ending } = useEndCompetencyJobAssignment();
  const assignments = data.jobAssignments.filter((x) => x.userId === employeeId);
  return (
    <section className="space-y-4" data-testid="competency-job-assignments">
      <h2 className="text-xl font-semibold">{t("competencies.jobs.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("competencies.jobs.notice")}</p>
      {assignments.map((job) => (
        <article
          key={job.id}
          className="space-y-1 rounded border p-4"
          data-testid="competency-job-assignment"
        >
          <h3 className="font-semibold">
            {data.roles.find((x) => x.id === job.jobRoleId)?.name} ·{" "}
            {t(job.isPrimary ? "competencies.jobs.primary" : "competencies.jobs.additional")}
          </h3>
          <p>
            {data.units.find((x) => x.id === job.organizationalUnitId)?.name} ·{" "}
            {t(`competencies.jobs.states.${job.state}`)}
          </p>
          <p>
            {t("competencies.jobs.manager")}:{" "}
            {data.actors.find((x) => x.id === job.managerId)?.name ?? "—"}
          </p>
          <p>
            {job.startsAt
              ? formatLocalizedDate(language, job.startsAt)
              : t("competencies.jobs.unknownStart")}{" "}
            → {job.endsAt ? formatLocalizedDate(language, job.endsAt) : "—"}
          </p>
          {job.externalHrId && (
            <p>
              {t("competencies.jobs.externalId")}: {job.externalHrId}
            </p>
          )}
          {data.canManage &&
            job.state === "active" &&
            (!job.startsAt || Date.parse(job.startsAt) <= Date.now()) && (
              <Button
                variant="outline"
                disabled={creating || ending}
                onClick={() => void end(job.id).catch(() => {})}
              >
                {t("competencies.jobs.end")}
              </Button>
            )}
        </article>
      ))}
      {data.canManage && (
        <BusyForm
          busy={creating || ending}
          className="rounded border p-4"
          data-testid="competency-job-assignment-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const d = new FormData(form);
            void create({
              id: crypto.randomUUID(),
              userId: employeeId,
              jobRoleId: value(d, "jobRoleId"),
              organizationalUnitId: value(d, "organizationalUnitId"),
              managerId: value(d, "managerId") || null,
              startsAt: optionalDate(d, "startsAt") ?? new Date().toISOString(),
              endsAt: optionalDate(d, "endsAt"),
              externalHrId: value(d, "externalHrId") || null,
            })
              .then(() => form.reset())
              .catch(() => {});
          }}
        >
          <h3 className="font-semibold">{t("competencies.jobs.create")}</h3>
          <Picker name="jobRoleId" label={t("competencies.role")} options={data.roles} />
          <Picker name="organizationalUnitId" label={t("competencies.unit")} options={data.units} />
          <Picker
            name="managerId"
            label={t("competencies.jobs.manager")}
            options={(setup?.assessors ?? []).filter((x) => x.id !== employeeId)}
            optional
          />
          <Field label={t("competencies.jobs.startsAt")}>
            <Input name="startsAt" type="datetime-local" />
          </Field>
          <Field label={t("competencies.jobs.endsAt")}>
            <Input name="endsAt" type="datetime-local" />
          </Field>
          <Field label={t("competencies.jobs.externalId")}>
            <Input name="externalHrId" maxLength={120} />
          </Field>
          <Button type="submit">{t("competencies.jobs.create")}</Button>
        </BusyForm>
      )}
    </section>
  );
}
