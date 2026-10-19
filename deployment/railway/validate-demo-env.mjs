import { pathToFileURL } from "node:url";
export function validateDemoEnvironment(env) {
  const errors = [];
  for (const key of [
    "CONTROL_DATABASE_URL",
    "LMS_DATABASE_URL",
    "REDIS_URL",
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET_NAME",
    "SMTP_HOST",
    "SMTP_EMAIL_FROM",
    "MASTER_KEY",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
  ]) {
    if (!env[key]) errors.push(`${key}: required`);
  }
  if (env.NODE_ENV !== "production") errors.push("NODE_ENV: use production for secure cookies");
  if (env.DEMONSTRATION_MODE !== "true") errors.push("DEMONSTRATION_MODE: must be true");
  if (env.RUN_STARTUP_MAINTENANCE !== "false")
    errors.push("RUN_STARTUP_MAINTENANCE: must be false");
  if (env.DISABLE_RATE_LIMITING === "true") errors.push("DISABLE_RATE_LIMITING: prohibited");
  for (const key of ["TEST_KEY", "DEV_TENANT_ORIGINS", "MIGRATOR_DATABASE_URL", "DATABASE_URL"]) {
    if (env[key]) errors.push(`${key}: must be absent from runtime`);
  }
  for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET"]) {
    if ((env[key]?.length ?? 0) < 32) errors.push(`${key}: minimum 32 characters`);
  }
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) errors.push("JWT secrets: must be different");
  if (Buffer.from(env.MASTER_KEY ?? "", "base64").length !== 32)
    errors.push("MASTER_KEY: expected 32 bytes in base64");
  try {
    if (new URL(env.CORS_ORIGIN).protocol !== "https:") throw new Error();
  } catch {
    errors.push("CORS_ORIGIN: expected one HTTPS demo origin");
  }
  if (env.EMAIL_ADAPTER !== "smtp")
    errors.push("EMAIL_ADAPTER: configure authorized SMTP or a private SMTP capture service");
  for (const key of ["GOOGLE_OAUTH_ENABLED", "MICROSOFT_OAUTH_ENABLED", "SLACK_OAUTH_ENABLED"]) {
    if (env[key] !== "false") errors.push(`${key}: disable in this release profile`);
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateDemoEnvironment(process.env);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      "Demo environment shape validated; database grants, tenant settings and network checks are still required",
    );
}
