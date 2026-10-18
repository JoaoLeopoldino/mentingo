import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";

import { DatabasePg } from "src/common";
import { DB } from "src/storage/db/db.providers";
import { competencyFrameworks, competencyScales } from "src/storage/schema";

import type {
  CreateCompetencyFramework,
  CreateCompetencyScale,
} from "./competency-frameworks.schema";
@Injectable()
export class CompetencyFrameworksRepository {
  constructor(@Inject(DB) private readonly db: DatabasePg) {}
  async setup() {
    return {
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
