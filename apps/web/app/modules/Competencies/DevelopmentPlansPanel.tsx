import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useCreateDevelopmentPlan } from "~/api/mutations/useCreateDevelopmentPlan";
import { useDecideDevelopmentPlan } from "~/api/mutations/useDecideDevelopmentPlan";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";
import { formatLocalizedDate } from "~/utils/formatLocalizedDate";

import { BusyForm, Field, Picker, value } from "./competency-controls";

import type {
  GetCompetencyWorkspaceResponse,
  GetDevelopmentPlansResponse,
  DecideDevelopmentPlanBody,
} from "~/api/generated-api";
export function DevelopmentPlansPanel({
  data,
  plans,
  employeeId,
  canApprove,
}: {
  data: GetCompetencyWorkspaceResponse["data"];
  plans: GetDevelopmentPlansResponse["data"] | undefined;
  employeeId: string;
  canApprove: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const [competencyId, setCompetencyId] = useState("");
  const { mutateAsync: create, isPending: creating } = useCreateDevelopmentPlan();
  const { mutateAsync: decide, isPending: deciding } = useDecideDevelopmentPlan();
  const submit =
    (action: (form: FormData) => Promise<unknown>) => (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      void action(new FormData(form))
        .then(() => form.reset())
        .catch(() => {});
    };
  const current = plans?.plans.filter((x) => x.userId === employeeId) ?? [];
  const recommendation = data.matrix.find(
    (x) => x.userId === employeeId && x.competencyId === competencyId,
  );
  const learningOptions = (
    all: { id: string; name: string }[],
    id: string | null | undefined,
    label: string,
  ) => {
    if (data.canManage) return all;
    if (!id) return [];
    return [{ id, name: label }];
  };
  return (
    <section className="space-y-4" data-testid="competency-development-plans">
      <h2 className="text-xl font-semibold">{t("competencies.plans.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("competencies.plans.notice")}</p>
      <BusyForm
        busy={creating || deciding}
        className="grid gap-3 rounded border p-4"
        data-testid="competency-plan-create"
        onSubmit={submit((d) =>
          create({
            id: crypto.randomUUID(),
            userId: employeeId,
            competencyId,
            title: value(d, "title"),
            targetLevel: Number(value(d, "targetLevel")),
            deadline: new Date(value(d, "deadline")).toISOString(),
            activities: value(d, "activities")
              .split("\n")
              .filter(Boolean)
              .map((title, i) => ({
                title,
                courseId: i === 0 ? value(d, "courseId") || null : null,
                learningPathId: i === 0 ? value(d, "learningPathId") || null : null,
              })),
          }),
        )}
      >
        <h3 className="font-semibold">{t("competencies.plans.create")}</h3>
        <Field label={t("competencies.name")}>
          <Input name="title" required maxLength={200} />
        </Field>
        <Field label={t("competencies.competency")}>
          <select
            name="competencyId"
            aria-label={t("competencies.competency")}
            value={competencyId}
            onChange={(e) => setCompetencyId(e.target.value)}
            required
            className="h-10 w-full min-w-0 rounded border bg-background px-3"
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
        {recommendation && (
          <p className="text-sm">
            {t("competencies.required")}: {recommendation.requiredLevel} ·{" "}
            {t(`competencies.states.${recommendation.status}`)}
          </p>
        )}
        <Field label={t("competencies.plans.target")}>
          <Input name="targetLevel" type="number" min={1} max={20} required />
        </Field>
        <Field label={t("competencies.plans.deadline")}>
          <Input name="deadline" type="datetime-local" required />
        </Field>
        <Field label={t("competencies.plans.activities")}>
          <Textarea name="activities" required maxLength={4000} />
        </Field>
        <>
          <Picker
            name="courseId"
            label={t("competencies.course")}
            options={learningOptions(
              data.learning.courses,
              recommendation?.courseId,
              t("competencies.course"),
            )}
            optional
          />
          <Picker
            name="learningPathId"
            label={t("competencies.learningPath")}
            options={learningOptions(
              data.learning.learningPaths,
              recommendation?.learningPathId,
              t("competencies.path"),
            )}
            optional
          />
        </>
        <Button type="submit">{t("competencies.plans.create")}</Button>
      </BusyForm>
      {!current.length && <p>{t("competencies.plans.empty")}</p>}
      {current.map((plan) => {
        const items = plans!.activities.filter((x) => x.planId === plan.id);
        const actions: DecideDevelopmentPlanBody["action"][] = [];
        if (plan.state === "draft") actions.push("request_approval", "cancel");
        if (plan.state === "pending_approval") {
          if (canApprove) actions.push("approve", "return");
          actions.push("cancel");
        }
        if (plan.state === "active") actions.push("report_activity", "submit", "cancel");
        if (plan.state === "submitted") {
          if (canApprove) actions.push("complete", "return");
          actions.push("cancel");
        }
        return (
          <article
            key={plan.id}
            className="space-y-3 rounded border p-4"
            data-testid="competency-plan"
          >
            <h3 className="text-lg font-semibold">{plan.title}</h3>
            <p>
              {data.catalog.find((x) => x.id === plan.competencyId)?.name} ·{" "}
              {t("competencies.plans.target")}: {plan.targetLevel}
            </p>
            <p>
              {t(`competencies.plans.states.${plan.state}`)} ·{" "}
              {t("competencies.enterprise.revision")} {plan.version} ·{" "}
              {formatLocalizedDate(language, plan.deadline)}
            </p>
            <p>
              {t("competencies.plans.responsible")}:{" "}
              {plans?.people.find((x) => x.id === plan.responsibleId)?.name ?? "—"}
            </p>
            <ul className="list-inside list-disc">
              {items.map((item) => (
                <li key={item.id}>
                  {item.title} ·{" "}
                  {item.reportedAt
                    ? t("competencies.plans.reported")
                    : t("competencies.plans.awaitingActivity")}
                  {item.courseId && (
                    <>
                      {" "}
                      · {t("competencies.course")}:{" "}
                      {data.learning.courses.find((x) => x.id === item.courseId)?.name ??
                        item.courseId}
                    </>
                  )}
                </li>
              ))}
            </ul>
            {!!actions.length && (
              <BusyForm
                key={`${plan.id}:${plan.version}`}
                busy={creating || deciding}
                className="grid gap-3"
                data-testid={`competency-plan-decision-${plan.id}`}
                onSubmit={submit((d) => {
                  const action = value(d, "action") as DecideDevelopmentPlanBody["action"];
                  return decide({
                    id: plan.id,
                    body: {
                      id: crypto.randomUUID(),
                      expectedVersion: plan.version,
                      action,
                      rationale: value(d, "rationale"),
                      activityId:
                        action === "report_activity" ? value(d, "activityId") || null : null,
                    },
                  });
                })}
              >
                <Picker
                  name="action"
                  label={t("competencies.plans.action")}
                  options={actions.map((action) => ({
                    id: action,
                    name: t(`competencies.plans.actions.${action}`),
                  }))}
                />
                <Picker
                  name="activityId"
                  label={t("competencies.plans.activity")}
                  options={items.map((x) => ({ id: x.id, name: x.title }))}
                  optional
                />
                <Field label={t("competencies.enterprise.rationale")}>
                  <Textarea name="rationale" required maxLength={4000} />
                </Field>
                <Button type="submit">{t("competencies.save")}</Button>
              </BusyForm>
            )}
            <details>
              <summary>{t("competencies.plans.history")}</summary>
              <ol className="space-y-2 pt-2">
                {plans!.history
                  .filter((x) => x.planId === plan.id)
                  .map((entry) => (
                    <li key={entry.id} className="rounded border p-2">
                      {t(`competencies.plans.actions.${entry.action}`)} ·{" "}
                      {formatLocalizedDate(language, entry.createdAt)} ·{" "}
                      {plans?.people.find((x) => x.id === entry.actorId)?.name ??
                        t("competencies.enterprise.unknownActor")}
                      <p>{entry.rationale}</p>
                    </li>
                  ))}
              </ol>
            </details>
          </article>
        );
      })}
    </section>
  );
}
