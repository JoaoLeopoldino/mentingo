import { Link } from "@remix-run/react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useAssignCompetencyRole } from "~/api/mutations/useAssignCompetencyRole";
import { useCreateCompetency } from "~/api/mutations/useCreateCompetency";
import { useCreateCompetencyJobRole } from "~/api/mutations/useCreateCompetencyJobRole";
import { useRecordCompetencyEvidence } from "~/api/mutations/useRecordCompetencyEvidence";
import { useSetCompetencyActive } from "~/api/mutations/useSetCompetencyActive";
import { useSetCompetencyRequirement } from "~/api/mutations/useSetCompetencyRequirement";
import { useCompetencyFrameworkSetup } from "~/api/queries/useCompetencyFrameworkSetup";
import { useCompetencyWorkspace } from "~/api/queries/useCompetencyWorkspace";
import { useDevelopmentPlans } from "~/api/queries/useDevelopmentPlans";
import { getTranslatedApiErrorMessage } from "~/api/utils/getTranslatedApiErrorMessage";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";
import { setPageTitle } from "~/utils/setPageTitle";

import { Field, Picker, BusyForm, value, optionalDate } from "./competency-controls";
import { CompetencyAssessmentPanel } from "./CompetencyAssessmentPanel";
import { CompetencyFrameworksPanel } from "./CompetencyFrameworksPanel";
import { DevelopmentPlansPanel } from "./DevelopmentPlansPanel";
import { JobAssignmentsPanel } from "./JobAssignmentsPanel";

import type { MetaFunction } from "@remix-run/react";
import type { CompetencyWorkspaceQuery } from "~/api/queries/competency-workspace.types";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.competencies");

export default function CompetenciesPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<CompetencyWorkspaceQuery>({ page: 1, perPage: 25 });
  const [tab, setTab] = useState("matrix");
  const { data, isPending, error } = useCompetencyWorkspace(filters);
  const user = useCurrentUserStore((state) => state.currentUser);
  const [selected, setSelected] = useState("");
  const [frameworkId, setFrameworkId] = useState("");
  const [scaleId, setScaleId] = useState("");
  const { data: setup } = useCompetencyFrameworkSetup(Boolean(data?.canManage));
  const employeeId =
    selected || data?.employees.find((x) => x.id === user?.id)?.id || data?.employees[0]?.id;
  const { data: plans, error: plansError } = useDevelopmentPlans(employeeId);
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
  const selectedFramework = setup?.frameworks.find((x) => x.id === frameworkId);
  const selectedScale = setup?.scales.find((x) => x.id === scaleId);
  const active = data.catalog.filter((x) => x.active);
  const catalogName = (id: string) => data.catalog.find((x) => x.id === id)?.name ?? id;
  const unitNames = (userId: string, roleIds: string[]) => {
    const now = Date.now();
    const ids = new Set(
      data.jobAssignments
        .filter(
          (x) =>
            x.userId === userId &&
            roleIds.includes(x.jobRoleId) &&
            x.state === "active" &&
            (!x.startsAt || Date.parse(x.startsAt) <= now) &&
            (!x.endsAt || Date.parse(x.endsAt) > now),
        )
        .map((x) => x.organizationalUnitId),
    );
    return [...ids]
      .map((id) => data.units.find((x) => x.id === id)?.name)
      .filter(Boolean)
      .join(" · ");
  };
  const employeeName = (id: string) =>
    data.employees.find((x) => x.id === id)?.name ??
    data.actors.find((x) => x.id === id)?.name ??
    t("competencies.enterprise.unknownActor");

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
        <BusyForm
          busy={busy}
          className="rounded border p-4"
          data-testid="competency-filters"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setSelected("");
            setFilters({
              page: 1,
              perPage: 25,
              keyword: value(form, "keyword") || undefined,
              organizationalUnitId: value(form, "organizationalUnitId") || undefined,
              jobRoleId: value(form, "jobRoleId") || undefined,
              status: (value(form, "status") as CompetencyWorkspaceQuery["status"]) || undefined,
              pendingEvidenceOnly: value(form, "pendingEvidenceOnly") === "on" || undefined,
            });
          }}
        >
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label={t("competencies.team.search")}>
              <Input name="keyword" defaultValue={filters.keyword} maxLength={200} />
            </Field>
            <Picker
              key={`unit:${filters.organizationalUnitId}`}
              name="organizationalUnitId"
              label={t("competencies.unit")}
              options={data.units}
              defaultValue={filters.organizationalUnitId}
              optional
            />
            <Picker
              key={`role:${filters.jobRoleId}`}
              name="jobRoleId"
              label={t("competencies.role")}
              options={data.roles}
              defaultValue={filters.jobRoleId}
              optional
            />
            <Picker
              key={`status:${filters.status}`}
              name="status"
              label={t("competencies.status")}
              defaultValue={filters.status}
              options={[
                "met",
                "missing",
                "insufficient",
                "pending",
                "expired",
                "evidence_rejected",
                "revoked",
                "suspended",
              ].map((id) => ({ id, name: t(`competencies.states.${id}`) }))}
              optional
            />
          </div>
          {(data.canAssess || data.canManage) && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="pendingEvidenceOnly"
                defaultChecked={
                  filters.pendingEvidenceOnly === true || filters.pendingEvidenceOnly === "true"
                }
              />
              {t("competencies.team.pendingOnly")}
            </label>
          )}
          <Button type="submit">{t("competencies.team.apply")}</Button>
        </BusyForm>
        {filters.userId && (
          <Button
            variant="outline"
            onClick={() => {
              setSelected("");
              setFilters({ page: 1, perPage: 25 });
              setTab("matrix");
            }}
          >
            {t("competencies.team.back")}
          </Button>
        )}
        <nav
          aria-label={t("competencies.team.pagination")}
          className="flex flex-wrap items-center gap-3"
        >
          <p role="status">
            {t("competencies.team.pageSummary", {
              page: data.pagination.page,
              total: data.pagination.total,
              count: data.employees.length,
            })}
          </p>
          <Button
            variant="outline"
            disabled={data.pagination.page <= 1}
            onClick={() => {
              setSelected("");
              setFilters({ ...filters, page: data.pagination.page - 1 });
            }}
          >
            {t("competencies.team.previous")}
          </Button>
          <Button
            variant="outline"
            disabled={data.pagination.page * data.pagination.perPage >= data.pagination.total}
            onClick={() => {
              setSelected("");
              setFilters({ ...filters, page: data.pagination.page + 1 });
            }}
          >
            {t("competencies.team.next")}
          </Button>
        </nav>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="matrix">{t("competencies.matrix")}</TabsTrigger>
            <TabsTrigger value="profile">{t("competencies.profile")}</TabsTrigger>
            {(data.canManage || data.canAssess) && (
              <TabsTrigger value="pending">{t("competencies.team.pending")}</TabsTrigger>
            )}
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
                    return (
                      <tr key={`${row.userId}:${row.competencyId}`} className="border-t">
                        <td className="p-2">{employeeName(row.userId)}</td>
                        <td className="p-2">{unitNames(row.userId, row.jobRoleIds)}</td>
                        <td className="p-2">
                          {row.jobRoleIds
                            .map((id) => data.roles.find((x) => x.id === id)?.name)
                            .filter(Boolean)
                            .join(" · ")}
                        </td>
                        <td className="p-2">{catalogName(row.competencyId)}</td>
                        <td className="p-2">
                          {row.requiredLevel} ·{" "}
                          {t(
                            row.mandatory
                              ? "competencies.frameworks.mandatory"
                              : "competencies.frameworks.optional",
                          )}
                        </td>
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
          {(data.canManage || data.canAssess) && (
            <TabsContent
              value="pending"
              className="space-y-3"
              data-testid="competency-pending-queue"
            >
              <p>{t("competencies.team.pendingScope")}</p>
              {data.evidence
                .filter(
                  (x) =>
                    (data.evidenceReviews.find((r) => r.evidenceId === x.id)?.status ??
                      x.status) === "pending",
                )
                .map((proof) => (
                  <article
                    key={proof.id}
                    className="rounded border p-4"
                    data-testid="competency-pending-evidence"
                  >
                    <h2 className="font-semibold">
                      {employeeName(proof.userId)} · {catalogName(proof.competencyId)}
                    </h2>
                    <p>
                      {proof.source}: {proof.evidence}
                    </p>
                    <Button
                      onClick={() => {
                        setSelected(proof.userId);
                        setFilters({ page: 1, perPage: 25, userId: proof.userId });
                        setTab("profile");
                      }}
                    >
                      {t("competencies.enterprise.reviewEvidence")}
                    </Button>
                  </article>
                ))}
            </TabsContent>
          )}
          <TabsContent value="profile" className="space-y-4">
            {employeeId ? (
              <>
                <Field label={t("competencies.employee")}>
                  <select
                    className="h-10 w-full min-w-0 rounded border bg-background px-3"
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
                <h2 className="text-xl font-semibold">
                  {t("competencies.enterprise.evidenceHistory")}
                </h2>
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
                        {t(
                          `competencies.enterprise.reviewStates.${data.evidenceReviews.find((x) => x.evidenceId === item.id)?.status ?? item.status}`,
                        )}
                      </h3>
                      <p>
                        {item.source}: {item.evidence}
                      </p>
                      <p>
                        {t("competencies.enterprise.recordedBy")}: {employeeName(item.recordedBy)} ·{" "}
                        {item.createdAt
                          ? new Intl.DateTimeFormat("pt-AO", {
                              timeZone: "Africa/Luanda",
                              dateStyle: "short",
                            }).format(new Date(item.createdAt))
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
                      status: "pending",
                      developmentPlanId: value(d, "developmentPlanId") || null,
                      evidenceType: value(d, "evidenceType") as
                        | "observation"
                        | "document"
                        | "training"
                        | "self_report",
                      source: value(d, "source"),
                      evidence: value(d, "evidence"),
                      expiresAt: null,
                      reviewAt: null,
                    }),
                  )}
                  data-testid="competency-evidence-form"
                >
                  <h3 className="font-semibold">{t("competencies.recordEvidence")}</h3>
                  <Picker
                    name="competencyId"
                    label={t("competencies.competency")}
                    options={active}
                  />
                  <Picker
                    name="developmentPlanId"
                    label={t("competencies.plans.linkEvidence")}
                    optional
                    options={(plans?.plans ?? [])
                      .filter(
                        (x) => x.userId === employeeId && ["active", "submitted"].includes(x.state),
                      )
                      .map((x) => ({ id: x.id, name: x.title }))}
                  />
                  <Field label={t("competencies.enterprise.claimedLevel")}>
                    <Input name="level" type="number" min={1} max={20} required />
                  </Field>
                  <Field label={t("competencies.enterprise.evidenceType")}>
                    <select
                      aria-label={t("competencies.enterprise.evidenceType")}
                      name="evidenceType"
                      className="h-10 w-full min-w-0 rounded border bg-background px-3"
                    >
                      {["self_report", "observation", "document", "training"].map((kind) => (
                        <option key={kind} value={kind}>
                          {t(`competencies.enterprise.types.${kind}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("competencies.source")}>
                    <Input name="source" maxLength={200} required />
                  </Field>
                  <Field label={t("competencies.evidence")}>
                    <Textarea name="evidence" maxLength={4000} required />
                  </Field>
                  <Button disabled={recording}>{t("competencies.save")}</Button>
                </BusyForm>
                {plansError && (
                  <p role="alert">
                    {getTranslatedApiErrorMessage(plansError, t, t("competencies.errors.failed"))}
                  </p>
                )}
                <DevelopmentPlansPanel
                  data={data}
                  plans={plans}
                  employeeId={employeeId!}
                  canApprove={data.canManage || (data.canAssess && employeeId !== user?.id)}
                />
                <JobAssignmentsPanel data={data} setup={setup} employeeId={employeeId!} />
                <CompetencyAssessmentPanel
                  data={data}
                  employeeId={employeeId!}
                  canAssess={data.canManage || (data.canAssess && employeeId !== user?.id)}
                />
              </>
            ) : (
              <p>{t("competencies.empty")}</p>
            )}
          </TabsContent>
          {data.canManage && (
            <>
              <TabsContent value="catalog" className="space-y-4">
                <CompetencyFrameworksPanel setup={setup} />
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
                      frameworkId: frameworkId || null,
                      scaleId: scaleId || null,
                      levels:
                        selectedScale?.levels ??
                        value(d, "levels")
                          .split("\n")
                          .map((label, index) => ({ rank: index + 1, label: label.trim() })),
                    }),
                  )}
                >
                  <h2 className="text-xl font-semibold">{t("competencies.create")}</h2>
                  {["code", "name"].map((key) => (
                    <Field key={key} label={t(`competencies.${key}`)}>
                      <Input
                        name={key}
                        required
                        maxLength={key === "code" ? 60 : 200}
                        pattern={key === "code" ? "[A-Z0-9_-]+" : undefined}
                      />
                    </Field>
                  ))}
                  <Field label={t("competencies.frameworks.framework")}>
                    <select
                      name="frameworkId"
                      aria-label={t("competencies.frameworks.framework")}
                      value={frameworkId}
                      onChange={(e) => setFrameworkId(e.target.value)}
                      className="h-10 w-full min-w-0 rounded border bg-background px-3"
                    >
                      <option value="">—</option>
                      {setup?.frameworks.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {selectedFramework ? (
                    <Picker
                      key={frameworkId}
                      name="category"
                      label={t("competencies.category")}
                      options={selectedFramework.categories.map((x) => ({ id: x, name: x }))}
                    />
                  ) : (
                    <Field label={t("competencies.category")}>
                      <Input name="category" required maxLength={200} />
                    </Field>
                  )}
                  <Field label={t("competencies.frameworks.scale")}>
                    <select
                      name="scaleId"
                      aria-label={t("competencies.frameworks.scale")}
                      value={scaleId}
                      onChange={(e) => setScaleId(e.target.value)}
                      className="h-10 w-full min-w-0 rounded border bg-background px-3"
                    >
                      <option value="">—</option>
                      {setup?.scales.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("competencies.description")}>
                    <Textarea name="description" maxLength={4000} />
                  </Field>
                  {selectedScale ? (
                    <p>{selectedScale.levels.map((x) => `${x.rank}: ${x.label}`).join(" · ")}</p>
                  ) : (
                    <Field label={t("competencies.levelsHint")}>
                      <Textarea name="levels" required />
                    </Field>
                  )}
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
                      mandatory: value(d, "mandatory") !== "optional",
                      expectedVersion:
                        data.requirements.find(
                          (x) =>
                            x.jobRoleId === value(d, "jobRoleId") &&
                            x.competencyId === value(d, "competencyId"),
                        )?.version ?? 0,
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
                  <Field label={t("competencies.frameworks.requirementType")}>
                    <select
                      name="mandatory"
                      aria-label={t("competencies.frameworks.requirementType")}
                      className="h-10 w-full min-w-0 rounded border bg-background px-3"
                    >
                      <option value="mandatory">{t("competencies.frameworks.mandatory")}</option>
                      <option value="optional">{t("competencies.frameworks.optional")}</option>
                    </select>
                  </Field>
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
                <details className="col-span-full rounded border p-4">
                  <summary>{t("competencies.frameworks.requirementHistory")}</summary>
                  <ul>
                    {data.requirementHistory.map((x) => (
                      <li key={x.id}>
                        {data.roles.find((r) => r.id === x.jobRoleId)?.name} ·{" "}
                        {catalogName(x.competencyId)} · {t("competencies.enterprise.revision")}{" "}
                        {x.version} · ≥ {x.minimumLevel} ·{" "}
                        {t(
                          x.mandatory
                            ? "competencies.frameworks.mandatory"
                            : "competencies.frameworks.optional",
                        )}{" "}
                        · {x.effectiveFrom} → {x.effectiveUntil ?? "—"}
                      </li>
                    ))}
                  </ul>
                </details>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </PageWrapper>
  );
}
