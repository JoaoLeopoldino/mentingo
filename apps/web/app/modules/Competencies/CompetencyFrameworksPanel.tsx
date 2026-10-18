import { useTranslation } from "react-i18next";

import { useCreateCompetencyFramework } from "~/api/mutations/useCreateCompetencyFramework";
import { useCreateCompetencyScale } from "~/api/mutations/useCreateCompetencyScale";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

import { BusyForm, Field, value } from "./competency-controls";

import type { FormEvent } from "react";
import type { GetCompetencyFrameworkSetupResponse } from "~/api/generated-api";
export function CompetencyFrameworksPanel({
  setup,
}: {
  setup: GetCompetencyFrameworkSetupResponse["data"] | undefined;
}) {
  const { t } = useTranslation();
  const { mutateAsync: createFramework, isPending: creatingFramework } =
    useCreateCompetencyFramework();
  const { mutateAsync: createScale, isPending: creatingScale } = useCreateCompetencyScale();
  const submit = (action: (d: FormData) => Promise<unknown>) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    void action(new FormData(form))
      .then(() => form.reset())
      .catch(() => {});
  };
  return (
    <section className="space-y-4" data-testid="competency-framework-setup">
      <h2 className="text-xl font-semibold">{t("competencies.frameworks.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("competencies.frameworks.notice")}</p>
      <div className="grid gap-4 xl:grid-cols-2">
        <BusyForm
          busy={creatingFramework || creatingScale}
          className="rounded border p-4"
          data-testid="competency-framework-form"
          onSubmit={submit((d) =>
            createFramework({
              code: value(d, "code"),
              name: value(d, "name"),
              description: value(d, "description"),
              categories: value(d, "categories")
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean),
            }),
          )}
        >
          <h3 className="font-semibold">{t("competencies.frameworks.create")}</h3>
          <Field label={t("competencies.code")}>
            <Input name="code" required maxLength={60} pattern="[A-Z0-9_-]+" />
          </Field>
          <Field label={t("competencies.name")}>
            <Input name="name" required maxLength={200} />
          </Field>
          <Field label={t("competencies.description")}>
            <Textarea name="description" maxLength={4000} />
          </Field>
          <Field label={t("competencies.frameworks.categories")}>
            <Textarea name="categories" required />
          </Field>
          <Button type="submit">{t("competencies.save")}</Button>
        </BusyForm>
        <BusyForm
          busy={creatingFramework || creatingScale}
          className="rounded border p-4"
          data-testid="competency-scale-form"
          onSubmit={submit((d) =>
            createScale({
              code: value(d, "code"),
              name: value(d, "name"),
              levels: value(d, "levels")
                .split("\n")
                .map((label, i) => ({ rank: i + 1, label: label.trim() })),
            }),
          )}
        >
          <h3 className="font-semibold">{t("competencies.frameworks.createScale")}</h3>
          <Field label={t("competencies.code")}>
            <Input name="code" required maxLength={60} pattern="[A-Z0-9_-]+" />
          </Field>
          <Field label={t("competencies.name")}>
            <Input name="name" required maxLength={200} />
          </Field>
          <Field label={t("competencies.levelsHint")}>
            <Textarea name="levels" required />
          </Field>
          <Button type="submit">{t("competencies.save")}</Button>
        </BusyForm>
      </div>
      <ul>
        {setup?.frameworks.map((x) => (
          <li key={x.id}>
            {x.code} · {x.name}: {x.categories.join(" · ")}
          </li>
        ))}
      </ul>
      <ul>
        {setup?.scales.map((x) => (
          <li key={x.id}>
            {x.code} · {x.name}: {x.levels.map((l) => `${l.rank}: ${l.label}`).join(" · ")}
          </li>
        ))}
      </ul>
    </section>
  );
}
