import type { API } from "../generated-api";
export type CompetencyWorkspaceQuery = NonNullable<
  Parameters<API<unknown>["api"]["competenciesControllerGetCompetencyWorkspace"]>[0]
>;
