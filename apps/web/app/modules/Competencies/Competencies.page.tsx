import { Link } from "@remix-run/react";
import { useState, type FormEvent, type FormHTMLAttributes, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useAssignCompetencyRole } from "~/api/mutations/useAssignCompetencyRole";
import { useCreateCompetency } from "~/api/mutations/useCreateCompetency";
import { useCreateCompetencyJobRole } from "~/api/mutations/useCreateCompetencyJobRole";
import { useRecordCompetencyEvidence } from "~/api/mutations/useRecordCompetencyEvidence";
import { useSetCompetencyActive } from "~/api/mutations/useSetCompetencyActive";
import { useSetCompetencyRequirement } from "~/api/mutations/useSetCompetencyRequirement";
import { useCompetencyWorkspace } from "~/api/queries/useCompetencyWorkspace";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      {children}
    </label>
  );
}
function Picker({
  name,
  label,
  options,
  optional = false,
}: {
  name: string;
  label: string;
  options: { id: string; name: string }[];
  optional?: boolean;
}) {
  return (
    <Field label={label}>
      <select
        name={name}
        aria-label={label}
        required={!optional}
        className="h-10 rounded border bg-background px-3"
        defaultValue=""
      >
        <option value="">—</option>
        {options.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const optionalDate = (data: FormData, key: string) =>
  value(data, key) ? new Date(value(data, key)).toISOString() : null;

function BusyForm({
  busy,
  children,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & { busy: boolean }) {
  const { t } = useTranslation();
  const control = (target: EventTarget | null) =>
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement;
  return (
    <form
      {...props}
      onInvalidCapture={(event) => {
        if (control(event.target))
          (event.target as HTMLInputElement).setCustomValidity(
            t("competencies.errors.invalidForm"),
          );
      }}
      onInputCapture={(event) => {
        if (control(event.target)) (event.target as HTMLInputElement).setCustomValidity("");
      }}
    >
      <fieldset disabled={busy} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.competencies");

export default function CompetenciesPage() {
  const { t } = useTranslation();
  const { data, isPending, error } = useCompetencyWorkspace();
  const user = useCurrentUserStore((state) => state.currentUser);
  const [selected, setSelected] = useState("");
  const { mutateAsync: create, isPending: creating } = useCreateCompetency();
  const { mutateAsync: createRole, isPending: creatingRole } = useCreateCompetencyJobRole();
  const { mutateAsync: setRequirement, isPending: savingRequirement } =
    useSetCompetencyRequirement();
  const { mutateAsync: assign, isPending: assigning } = useAssignCompetencyRole();
  const { mutateAsync: record, isPending: recording } = useRecordCompetencyEvidence();
  const { mutateAsync: activate, isPending: activating } = useSetCompetencyActive();
  const busy =
    creating || creatingRole || savingRequirement || assigning || recording || activating;
  if (isPending)
    return (
      <PageWrapper>
        <p role="status">{t("competencies.loading")}</p>
      </PageWrapper>
    );
  if (!data)
    return (
      <PageWrapper>
        <p role="alert">
          {getTranslatedApiErrorMessage(error, t, t("competencies.errors.failed"))}
        </p>
      </PageWrapper>
    );
  const active = data.catalog.filter((x) => x.active);
  const catalogName = (id: string) => data.catalog.find((x) => x.id === id)?.name ?? id;
  const employeeName = (id: string) => data.employees.find((x) => x.id === id)?.name ?? id;
  const employeeId = selected || user?.id || data.employees[0]?.id;
  const submit =
    (action: (data: FormData) => Promise<unknown>) => (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      void action(new FormData(form))
        .then(() => form.reset())
        .catch(() => {});
    };
  const employeeOptions = data.employees.map((x) => ({ id: x.id, name: x.name }));
  return (
    <PageWrapper>
      <div className="space-y-6" data-testid="competencies-workspace">
        <header>
          <h1 className="text-2xl font-semibold">{t("competencies.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("competencies.scope")}</p>
        </header>
        <Tabs defaultValue="matrix">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="matrix">{t("competencies.matrix")}</TabsTrigger>
            <TabsTrigger value="profile">{t("competencies.profile")}</TabsTrigger>
            {data.canManage && (
              <>
                <TabsTrigger value="catalog">{t("competencies.catalog")}</TabsTrigger>
                <TabsTrigger value="roles">{t("competencies.roles")}</TabsTrigger>
              </>
            )}
          </TabsList>
          <TabsContent value="matrix">
            <h2 className="my-4 text-xl font-semibold">{t("competencies.matrix")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="competency-matrix">
                <thead>
                  <tr>
                    {[
                      "employee",
                      "unit",
                      "role",
                      "competency",
                      "required",
                      "demonstrated",
                      "status",
                      "learning",
                    ].map((key) => (
                      <th key={key} className="p-2">
                        {t(`competencies.${key}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.matrix.map((row) => {
                    const employee = data.employees.find((x) => x.id === row.userId);
                    return (
                      <tr key={`${row.userId}:${row.competencyId}`} className="border-t">
                        <td className="p-2">{employeeName(row.userId)}</td>
                        <td className="p-2">
                          {data.units.find((x) => x.id === employee?.organizationalUnitId)?.name}
                        </td>
                        <td className="p-2">
                          {data.roles.find((x) => x.id === employee?.jobRoleId)?.name}
                        </td>
                        <td className="p-2">{catalogName(row.competencyId)}</td>
                        <td className="p-2">{row.requiredLevel}</td>
                        <td className="p-2">{row.currentLevel ?? "—"}</td>
                        <td className="p-2">{t(`competencies.states.${row.status}`)}</td>
                        <td className="p-2">
                          {row.status !== "met" && (
                            <>
                              {row.courseId && (
                                <Link className="underline" to={`/course/${row.courseId}`}>
                                  {t("competencies.course")}
                                </Link>
                              )}
                              {row.learningPathId && (
                                <Link className="ml-2 underline" to="/development-paths">
                                  {t("competencies.path")}
                                </Link>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!data.matrix.length && <p>{t("competencies.empty")}</p>}
          </TabsContent>
          <TabsContent value="profile" className="space-y-4">
            <Field label={t("competencies.employee")}>
              <select
                className="h-10 rounded border bg-background px-3"
                value={employeeId}
                aria-label={t("competencies.employee")}
                onChange={(event) => setSelected(event.target.value)}
              >
                {employeeOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <h2 className="text-xl font-semibold">{t("competencies.history")}</h2>
            {data.evidence
              .filter((x) => x.userId === employeeId)
              .map((item) => (
                <article
                  key={item.id}
                  className="space-y-1 rounded border p-3"
                  data-testid="competency-evidence"
                >
                  <h3 className="font-semibold">
                    {catalogName(item.competencyId)} · {item.level} ·{" "}
                    {t(`competencies.states.${item.status}`)}
                  </h3>
                  <p>
                    {item.source}: {item.evidence}
                  </p>
                  <p>
                    {t("competencies.assessor")}:{" "}
                    {item.assessorId ? employeeName(item.assessorId) : "—"} ·{" "}
                    {item.assessedAt
                      ? new Intl.DateTimeFormat("pt-AO", {
                          timeZone: "Africa/Luanda",
                          dateStyle: "short",
                        }).format(new Date(item.assessedAt))
                      : "—"}
                  </p>
                  {item.expiresAt && (
                    <p>
                      {t("competencies.expiry")}:{" "}
                      {new Intl.DateTimeFormat("pt-AO", {
                        timeZone: "Africa/Luanda",
                        dateStyle: "short",
                      }).format(new Date(item.expiresAt))}
                    </p>
                  )}
                </article>
              ))}
            <BusyForm
              busy={busy}
              className="grid max-w-2xl gap-3 rounded border p-4"
              onSubmit={submit((d) =>
                record({
                  userId: employeeId!,
                  competencyId: value(d, "competencyId"),
                  level: Number(value(d, "level")),
                  status: value(d, "status") as "pending" | "approved" | "rejected",
                  source: value(d, "source"),
                  evidence: value(d, "evidence"),
                  expiresAt: optionalDate(d, "expiresAt"),
                  reviewAt: optionalDate(d, "reviewAt"),
                }),
              )}
              data-testid="competency-evidence-form"
            >
              <h3 className="font-semibold">{t("competencies.recordEvidence")}</h3>
              <Picker name="competencyId" label={t("competencies.competency")} options={active} />
              <Field label={t("competencies.level")}>
                <Input name="level" type="number" min={1} max={20} required />
              </Field>
              <Field label={t("competencies.status")}>
                <select name="status" className="h-10 rounded border bg-background px-3">
                  <option value="pending">{t("competencies.states.pending")}</option>
                  {(data.canManage || (data.canAssess && employeeId !== user?.id)) && (
                    <>
                      <option value="approved">{t("competencies.states.approved")}</option>
                      <option value="rejected">{t("competencies.states.rejected")}</option>
                    </>
                  )}
                </select>
              </Field>
              <Field label={t("competencies.source")}>
                <Input name="source" maxLength={200} required />
              </Field>
              <Field label={t("competencies.evidence")}>
                <Textarea name="evidence" maxLength={4000} required />
              </Field>
              <Field label={t("competencies.expiry")}>
                <Input name="expiresAt" type="datetime-local" />
              </Field>
              <Field label={t("competencies.review")}>
                <Input name="reviewAt" type="datetime-local" />
              </Field>
              <Button disabled={recording}>{t("competencies.save")}</Button>
            </BusyForm>
          </TabsContent>
          {data.canManage && (
            <>
              <TabsContent value="catalog" className="space-y-4">
                <BusyForm
                  busy={busy}
                  className="grid max-w-2xl gap-3 rounded border p-4"
                  data-testid="competency-catalog-form"
                  onSubmit={submit((d) =>
                    create({
                      code: value(d, "code"),
                      name: value(d, "name"),
                      description: value(d, "description"),
                      category: value(d, "category"),
                      levels: value(d, "levels")
                        .split("\n")
                        .map((label, index) => ({ rank: index + 1, label: label.trim() })),
                    }),
                  )}
                >
                  <h2 className="text-xl font-semibold">{t("competencies.create")}</h2>
                  {["code", "name", "category"].map((key) => (
                    <Field key={key} label={t(`competencies.${key}`)}>
                      <Input
                        name={key}
                        required
                        maxLength={key === "code" ? 60 : 200}
                        pattern={key === "code" ? "[A-Z0-9_-]+" : undefined}
                      />
                    </Field>
                  ))}
                  <Field label={t("competencies.description")}>
                    <Textarea name="description" maxLength={4000} />
                  </Field>
                  <Field label={t("competencies.levelsHint")}>
                    <Textarea name="levels" required />
                  </Field>
                  <Button disabled={creating}>{t("competencies.save")}</Button>
                </BusyForm>
                {data.catalog.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {item.code} · {item.name}
                      </h3>
                      <p>{item.description}</p>
                      <p>{item.levels.map((x) => `${x.rank}: ${x.label}`).join(" · ")}</p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={activating}
                      onClick={() =>
                        void activate({ id: item.id, active: !item.active }).catch(() => {})
                      }
                    >
                      {t(item.active ? "competencies.deactivate" : "competencies.activate")}
                    </Button>
                  </article>
                ))}
              </TabsContent>
              <TabsContent value="roles" className="grid gap-4 lg:grid-cols-2">
                <BusyForm
                  busy={busy}
                  className="grid content-start gap-3 rounded border p-4"
                  onSubmit={submit((d) =>
                    createRole({ code: value(d, "code"), name: value(d, "name") }),
                  )}
                  data-testid="competency-role-form"
                >
                  <h2 className="text-lg font-semibold">{t("competencies.createRole")}</h2>
                  <Field label={t("competencies.code")}>
                    <Input name="code" pattern="[A-Z0-9_-]+" maxLength={60} required />
                  </Field>
                  <Field label={t("competencies.name")}>
                    <Input name="name" maxLength={200} required />
                  </Field>
                  <Button disabled={creatingRole}>{t("competencies.save")}</Button>
                </BusyForm>
                <BusyForm
                  busy={busy}
                  className="grid gap-3 rounded border p-4"
                  onSubmit={submit((d) =>
                    setRequirement({
                      jobRoleId: value(d, "jobRoleId"),
                      competencyId: value(d, "competencyId"),
                      minimumLevel: Number(value(d, "minimumLevel")),
                      effectiveFrom: optionalDate(d, "effectiveFrom") ?? new Date().toISOString(),
                      effectiveUntil: optionalDate(d, "effectiveUntil"),
                      courseId: value(d, "courseId") || null,
                      learningPathId: value(d, "learningPathId") || null,
                    }),
                  )}
                  data-testid="competency-requirement-form"
                >
                  <h2 className="text-lg font-semibold">{t("competencies.requirements")}</h2>
                  <Picker name="jobRoleId" label={t("competencies.role")} options={data.roles} />
                  <Picker
                    name="competencyId"
                    label={t("competencies.competency")}
                    options={active}
                  />
                  <Field label={t("competencies.required")}>
                    <Input name="minimumLevel" type="number" min={1} max={20} required />
                  </Field>
                  <Field label={t("competencies.effectiveFrom")}>
                    <Input name="effectiveFrom" type="datetime-local" />
                  </Field>
                  <Field label={t("competencies.effectiveUntil")}>
                    <Input name="effectiveUntil" type="datetime-local" />
                  </Field>
                  <Picker
                    name="courseId"
                    label={t("competencies.course")}
                    options={data.learning.courses}
                    optional
                  />
                  <Picker
                    name="learningPathId"
                    label={t("competencies.path")}
                    options={data.learning.learningPaths}
                    optional
                  />
                  <Button disabled={savingRequirement}>{t("competencies.save")}</Button>
                </BusyForm>
                <BusyForm
                  busy={busy}
                  className="grid gap-3 rounded border p-4"
                  onSubmit={submit((d) =>
                    assign({
                      userId: value(d, "userId"),
                      jobRoleId: value(d, "jobRoleId"),
                      organizationalUnitId: value(d, "organizationalUnitId"),
                    }),
                  )}
                  data-testid="competency-assignment-form"
                >
                  <h2 className="text-lg font-semibold">{t("competencies.assign")}</h2>
                  <p>{t("competencies.membershipHint")}</p>
                  <Picker
                    name="userId"
                    label={t("competencies.employee")}
                    options={employeeOptions}
                  />
                  <Picker name="jobRoleId" label={t("competencies.role")} options={data.roles} />
                  <Picker
                    name="organizationalUnitId"
                    label={t("competencies.unit")}
                    options={data.units}
                  />
                  <Button disabled={assigning}>{t("competencies.save")}</Button>
                </BusyForm>
                <section className="space-y-3 rounded border p-4">
                  <h2 className="text-lg font-semibold">{t("competencies.requirements")}</h2>
                  {data.requirements.map((x) => (
                    <p key={x.id}>
                      {data.roles.find((r) => r.id === x.jobRoleId)?.name} ·{" "}
                      {catalogName(x.competencyId)} ≥ {x.minimumLevel}
                    </p>
                  ))}
                </section>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </PageWrapper>
  );
}
