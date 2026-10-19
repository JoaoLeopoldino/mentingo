import { registerAs } from "@nestjs/config";
import { type Static, Type } from "@sinclair/typebox";

import { configValidator } from "src/utils/configValidator";

const schema = Type.Object({
  urlApp: Type.String(),
  urlAdmin: Type.String(),
});

type DatabaseConfig = Static<typeof schema>;

const validateDatabaseConfig = configValidator(schema);

export default registerAs("database", (): DatabaseConfig => {
  const fallbackUrl = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === "production" && process.env.RUN_STARTUP_MAINTENANCE === "false") {
    if (!process.env.CONTROL_DATABASE_URL || !process.env.LMS_DATABASE_URL) {
      throw new Error("Managed runtime requires CONTROL_DATABASE_URL and LMS_DATABASE_URL");
    }
    if (process.env.MIGRATOR_DATABASE_URL || fallbackUrl) {
      throw new Error(
        "Migration and fallback credentials must not be present in a managed runtime",
      );
    }
  }
  const values = {
    urlApp: process.env.LMS_DATABASE_URL || fallbackUrl,
    urlAdmin: process.env.CONTROL_DATABASE_URL || process.env.MIGRATOR_DATABASE_URL || fallbackUrl,
  };

  return validateDatabaseConfig(values);
});
