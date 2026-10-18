/** Test fixture provisioning only. Never changes existing credentials or production accounts. */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
const hashPassword = require("./src/common/helpers/hashPassword.ts").default;
export async function seedCompetencyQaCredential(userId: string, email: string) {
  if (!/^enterprise-(employee|manager)-[a-f0-9]+@example\.com$/.test(email))
    throw new Error("Refusing a non-fixture account");
  require("dotenv").config({
    path: fileURLToPath(new URL("../../../apps/api/.env", import.meta.url)),
  });
  const target = new URL(process.env.MIGRATOR_DATABASE_URL!);
  if (
    target.hostname !== "127.0.0.1" ||
    target.port !== "55432" ||
    target.pathname !== "/guidebook" ||
    process.env.NODE_ENV !== "development"
  )
    throw new Error("Refusing an unknown database");
  const db = require("postgres")(target.href, { max: 1 });
  try {
    const [user] =
      await db`SELECT id, tenant_id FROM users WHERE id=${userId} AND email=${email} AND created_at > CURRENT_TIMESTAMP - interval '10 minutes'`;
    if (!user) throw new Error("Fixture must be a newly created matching synthetic account");
    const [existing] = await db`SELECT id FROM credentials WHERE user_id=${userId}`;
    if (existing) throw new Error("Refusing to overwrite existing credentials");
    const password = await hashPassword("Password123@");
    await db`INSERT INTO credentials (user_id, tenant_id, password, requires_password_change) VALUES (${userId}, ${user.tenant_id}, ${password}, false)`;
  } finally {
    await db.end();
  }
}
