import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { monitorEventLoopDelay } from "node:perf_hooks";

import { SYSTEM_ROLE_SLUGS } from "@repo/shared";
import { eq } from "drizzle-orm";
import request from "supertest";

import hashPassword from "src/common/helpers/hashPassword";
import {
  DEFAULT_ADMIN_SETTINGS,
  DEFAULT_STUDENT_SETTINGS,
} from "src/settings/constants/settings.constants";
import {
  users,
  credentials,
  settings,
  userOnboarding,
  permissionRoles,
  permissionUserRoles,
  groupManagerGroups,
  studentCourses,
  competencyAssignments,
} from "src/storage/schema";
import { settingsToJSONBuildObject } from "src/utils/settings-to-json-build-object";

import { createE2ETest } from "../../../test/create-e2e-test";
import { createCategoryFactory } from "../../../test/factory/category.factory";
import { createCourseFactory } from "../../../test/factory/course.factory";
import { createGroupFactory } from "../../../test/factory/group.factory";
import { createSettingsFactory } from "../../../test/factory/settings.factory";
import { createUserFactory, credentialFactory } from "../../../test/factory/user.factory";
import { cookieFor } from "../../../test/helpers/test-helpers";

import type { INestApplication } from "@nestjs/common";

const loadTest = process.env.SPRINT_LOAD_TEST === "true" ? it : it.skip;
/** HTTP integration load, explicitly opt-in. Never targets the running demonstration database. */
describe("Enterprise HTTP load with 500 fictional employees and real RLS", () => {
  let app: INestApplication | undefined;
  afterAll(async () => {
    await app?.close();
  });
  loadTest(
    "measures 20, 50 and 100 distinct authenticated sessions",
    async () => {
      const setupStarted = performance.now();
      const context = await createE2ETest({ useDbProxy: true });
      app = context.app;
      const db = context.db;
      await createSettingsFactory(db).create();
      const admin = await createUserFactory(db)
        .withAdminSettings(db)
        .withCredentials({ password: "password123" })
        .create();
      const adminCookie = await cookieFor(admin, app);
      const prefix = randomUUID();
      const roleFor = (index: number) => {
        if (index % 20 === 0) return SYSTEM_ROLE_SLUGS.ADMIN;
        if (index % 20 < 4) return SYSTEM_ROLE_SLUGS.GROUP_MANAGER;
        return SYSTEM_ROLE_SLUGS.STUDENT;
      };
      const employees = Array.from({ length: 500 }, (_, index) => ({
        id: randomUUID(),
        tenantId: context.defaultTenantId,
        email: `load-${prefix}-${index}@example.com`,
        firstName: ["Luanda", "Huíla", "Benguela"][index % 3],
        lastName: `Fictício ${String(index).padStart(3, "0")}`,
        language: "pt-AO" as const,
      }));
      const inserted = await db.insert(users).values(employees).returning();
      const roles = await db
        .select()
        .from(permissionRoles)
        .where(eq(permissionRoles.tenantId, context.defaultTenantId));
      await db.insert(permissionUserRoles).values(
        employees.map((employee, index) => ({
          userId: employee.id,
          tenantId: context.defaultTenantId,
          roleId: roles.find((role) => role.slug === roleFor(index))!.id,
        })),
      );
      const active = employees
        .slice(0, 100)
        .map((employee) => inserted.find((row) => row.id === employee.id)!);
      await db
        .insert(userOnboarding)
        .values(
          active.map((employee) => ({ userId: employee.id, tenantId: context.defaultTenantId })),
        );
      const password = "synthetic-load-only";
      const hashed = await hashPassword(password);
      await db.insert(credentials).values(
        active.map((employee) => ({
          userId: employee.id,
          tenantId: context.defaultTenantId,
          password: hashed,
        })),
      );
      await db.insert(settings).values(
        active.map((employee, index) => ({
          userId: employee.id,
          tenantId: context.defaultTenantId,
          settings: settingsToJSONBuildObject(
            roleFor(index) === SYSTEM_ROLE_SLUGS.ADMIN
              ? DEFAULT_ADMIN_SETTINGS
              : DEFAULT_STUDENT_SETTINGS,
          ),
        })),
      );
      const group = await createGroupFactory(db)
        .withMembers(employees.map((employee) => employee.id))
        .create({ name: "Operações fictícias — ensaio de carga" });
      await db.insert(groupManagerGroups).values(
        active
          .filter((_, index) => roleFor(index) === SYSTEM_ROLE_SLUGS.GROUP_MANAGER)
          .map((employee) => ({
            managerUserId: employee.id,
            groupId: group.id,
            tenantId: context.defaultTenantId,
          })),
      );
      const category = await createCategoryFactory(db).create();
      const course = await createCourseFactory(db).create({
        authorId: admin.id,
        categoryId: category.id,
        title: "Segurança no Trabalho — carga fictícia",
        thumbnailS3Key: null,
        status: "published",
      });
      await db.insert(studentCourses).values(
        employees.map((employee) => ({
          studentId: employee.id,
          courseId: course.id,
          tenantId: context.defaultTenantId,
        })),
      );
      const competency = await request(app.getHttpServer())
        .post("/api/competencies/catalog")
        .set("Cookie", adminCookie)
        .send({
          code: prefix.toUpperCase(),
          name: "Prevenção de acidentes",
          description: "Observação profissional fictícia",
          category: "Segurança",
          levels: [
            { rank: 1, label: "Iniciado" },
            { rank: 2, label: "Autónomo" },
          ],
        })
        .expect(201);
      const role = await request(app.getHttpServer())
        .post("/api/competencies/roles")
        .set("Cookie", adminCookie)
        .send({ code: prefix.toUpperCase(), name: "Operador fictício" })
        .expect(201);
      await request(app.getHttpServer())
        .put("/api/competencies/requirements")
        .set("Cookie", adminCookie)
        .send({
          jobRoleId: role.body.data.id,
          competencyId: competency.body.data.id,
          minimumLevel: 2,
          effectiveFrom: "2026-01-01T00:00:00Z",
          effectiveUntil: null,
          courseId: course.id,
          learningPathId: null,
        })
        .expect(200);
      await db.insert(competencyAssignments).values(
        employees.map((employee) => ({
          userId: employee.id,
          jobRoleId: role.body.data.id,
          organizationalUnitId: group.id,
          assignedBy: admin.id,
          tenantId: context.defaultTenantId,
        })),
      );
      const sessions = [];
      for (const employee of active)
        sessions.push(
          await cookieFor(
            {
              ...employee,
              credentials: credentialFactory.build({
                userId: employee.id,
                tenantId: context.defaultTenantId,
                password,
              }),
            },
            app,
          ),
        );
      expect(new Set(sessions).size).toBe(100);
      await app.listen(0, "127.0.0.1");
      const address = app.getHttpServer().address();
      const server = `http://127.0.0.1:${address.port}`;
      const setupMs = performance.now() - setupStarted;
      const profiles = [];
      for (const concurrency of [20, 50, 100]) {
        const lag = monitorEventLoopDelay({ resolution: 20 });
        lag.enable();
        const records: { endpoint: string; ms: number; status: number }[] = [];
        const started = performance.now();
        await Promise.all(
          sessions.slice(0, concurrency).map(async (cookie, index) => {
            const read = async (endpoint: string, body?: object) => {
              const start = performance.now();
              const client = body
                ? request(server).post(endpoint).send(body)
                : request(server).get(endpoint);
              const response = await client
                .set("Cookie", cookie)
                .timeout({ response: 60000, deadline: 90000 });
              records.push({
                endpoint: endpoint.split("?")[0],
                ms: performance.now() - start,
                status: response.status,
              });
              expect(response.status).toBe(body ? 201 : 200);
            };
            for (let round = 0; round < 3; round++) {
              await read("/api/auth/current-user");
              await read(`/api/course?id=${course.id}&language=en`);
              await read("/api/competencies/workspace?page=1&perPage=25");
              if (roleFor(index) !== SYSTEM_ROLE_SLUGS.STUDENT)
                await read("/api/report/query", {
                  view: "organisation",
                  timezone: "Africa/Luanda",
                  groupIds: [],
                  language: "pt-AO",
                  page: 1,
                  pageSize: 25,
                });
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }),
        );
        lag.disable();
        const elapsedMs = performance.now() - started;
        const summary = (rows: typeof records) => {
          const values = rows.map((row) => row.ms).sort((a, b) => a - b);
          const percentile = (fraction: number) =>
            values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)];
          return {
            requests: rows.length,
            errors: rows.filter((row) => row.status < 200 || row.status >= 300).length,
            p50Ms: percentile(0.5),
            p95Ms: percentile(0.95),
            p99Ms: percentile(0.99),
            maxMs: values.at(-1),
          };
        };
        const result = {
          concurrency,
          elapsedMs,
          throughputRequestsPerSecond: records.length / (elapsedMs / 1000),
          ...summary(records),
          endpoints: Object.fromEntries(
            [...new Set(records.map((row) => row.endpoint))].map((endpoint) => [
              endpoint,
              summary(records.filter((row) => row.endpoint === endpoint)),
            ]),
          ),
          eventLoopP95Ms: lag.percentile(95) / 1e6,
          rssMiB: process.memoryUsage().rss / 1048576,
        };
        profiles.push(result);
        console.log("ENTERPRISE_HTTP_LOAD", JSON.stringify(result));
      }
      const output = resolve(process.cwd(), "../../.local/sprint");
      mkdirSync(output, { recursive: true });
      writeFileSync(
        resolve(output, "enterprise-http-load.json"),
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            setupMs,
            employees: 500,
            competenciesPerEmployee: 1,
            distinctSessions: 100,
            rounds: 3,
            thinkTimeMs: 100,
            environment:
              "Isolated Jest/Nest HTTP server with real PostgreSQL/RLS and Redis; test-mode middleware; same Mac as database. Not production, browser, video, AI or sustained-soak capacity.",
            profiles,
          },
          null,
          2,
        ),
      );
    },
    300000,
  );
});
