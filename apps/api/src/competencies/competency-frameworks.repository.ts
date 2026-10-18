import { Inject, Injectable } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { asc, eq, not, or, sql } from "drizzle-orm";

import { DatabasePg } from "src/common";
import { PermissionsService } from "src/permissions/permissions.service";
import { DB } from "src/storage/db/db.providers";
import { competencyFrameworks, competencyScales, users } from "src/storage/schema";

import type {
  CreateCompetencyFramework,
  CreateCompetencyScale,
} from "./competency-frameworks.schema";
@Injectable()
export class CompetencyFrameworksRepository {
  constructor(
    @Inject(DB) private readonly db: DatabasePg,
    private readonly permissionsService: PermissionsService,
  ) {}
  async setup() {
    return {
      assessors: await this.db
        .select({
          id: users.id,
          name: sql<string>`concat_ws(' ', ${users.firstName}, ${users.lastName})`,
        })
        .from(users)
        .where(
          or(
            not(
              this.permissionsService.excludeUsersWithPermission(
                PERMISSIONS.COMPETENCY_ASSESS_MANAGED,
              ),
            ),
            not(this.permissionsService.excludeUsersWithPermission(PERMISSIONS.COMPETENCY_MANAGE)),
          ),
        )
        .orderBy(asc(users.firstName)),
      frameworks: await this.db
        .select()
        .from(competencyFrameworks)
        .orderBy(asc(competencyFrameworks.code)),
      scales: await this.db.select().from(competencyScales).orderBy(asc(competencyScales.code)),
    };
  }
  async framework(id: string) {
    const [row] = await this.db
      .select()
      .from(competencyFrameworks)
      .where(eq(competencyFrameworks.id, id));
    return row;
  }
  async scale(id: string) {
    const [row] = await this.db.select().from(competencyScales).where(eq(competencyScales.id, id));
    return row;
  }
  async createFramework(body: CreateCompetencyFramework) {
    const [row] = await this.db
      .insert(competencyFrameworks)
      .values(body)
      .onConflictDoNothing()
      .returning({ id: competencyFrameworks.id });
    return row;
  }
  async createScale(body: CreateCompetencyScale) {
    const [row] = await this.db
      .insert(competencyScales)
      .values(body)
      .onConflictDoNothing()
      .returning({ id: competencyScales.id });
    return row;
  }
}
