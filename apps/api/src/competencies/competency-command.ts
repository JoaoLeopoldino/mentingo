import { createHash } from "node:crypto";
/** Flat validated commands: retries may reorder keys, but cannot change actor or payload. */
export const hashCompetencyCommand = (command: object, actorId: string) =>
  createHash("sha256")
    .update(
      JSON.stringify([actorId, Object.entries(command).sort(([a], [b]) => a.localeCompare(b))]),
    )
    .digest("hex");
