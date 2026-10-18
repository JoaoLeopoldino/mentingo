import type { PrimaveraAdapter, PrimaveraEmployee } from "./primavera.types";

/** Explicit mock adapter. Does not contact Primavera, accept credentials or grant LMS permissions. */
export class SyntheticPrimaveraAdapter implements PrimaveraAdapter {
  readonly source = "synthetic-primavera-mock";
  constructor(
    private readonly records: PrimaveraEmployee[],
    private readonly pageSize = 2,
  ) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
      throw new Error("invalid_page_size");
  }
  async fetchEmployees({ cursor, changedSince }: { cursor?: string; changedSince?: string }) {
    if (changedSince && !Number.isFinite(Date.parse(changedSince)))
      throw new Error("invalid_watermark");
    if (cursor && !/^\d+$/.test(cursor)) throw new Error("invalid_cursor");
    const selected = this.records.filter(
      (e) => !changedSince || Date.parse(e.updatedAt) >= Date.parse(changedSince),
    );
    const offset = cursor ? Number(cursor) : 0;
    const employees = structuredClone(selected.slice(offset, offset + this.pageSize));
    const nextCursor =
      offset + employees.length < selected.length ? String(offset + employees.length) : null;
    return { employees, nextCursor };
  }
}

export const SYNTHETIC_PRIMAVERA_EMPLOYEES: PrimaveraEmployee[] = [
  {
    externalId: "0001",
    displayName: "Ana Fictícia — Luanda",
    status: "active",
    updatedAt: "2026-10-18T09:00:00Z",
    assignments: [
      {
        externalId: "JOB-0001",
        unitId: "LUANDA",
        jobRoleId: "MANAGER",
        managerEmployeeId: null,
        startsAt: "2026-01-01T00:00:00Z",
        endsAt: null,
      },
    ],
  },
  {
    externalId: "0002",
    displayName: "Bento Fictício — Huíla",
    status: "active",
    updatedAt: "2026-10-18T09:00:00Z",
    assignments: [
      {
        externalId: "JOB-0002",
        unitId: "HUILA",
        jobRoleId: "OPERATOR",
        managerEmployeeId: "0001",
        startsAt: "2026-02-01T00:00:00Z",
        endsAt: null,
      },
    ],
  },
  {
    externalId: "0003",
    displayName: "Carla Fictícia — Benguela",
    status: "inactive",
    updatedAt: "2026-10-18T10:00:00Z",
    assignments: [
      {
        externalId: "JOB-0003",
        unitId: "BENGUELA",
        jobRoleId: "OPERATOR",
        managerEmployeeId: "0001",
        startsAt: "2026-02-01T00:00:00Z",
        endsAt: "2026-10-17T00:00:00Z",
      },
    ],
  },
];
