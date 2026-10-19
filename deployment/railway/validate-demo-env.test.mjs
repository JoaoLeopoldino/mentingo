import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDemoEnvironment } from "./validate-demo-env.mjs";
const valid = () => ({
  NODE_ENV: "production",
  DEMONSTRATION_MODE: "true",
  RUN_STARTUP_MAINTENANCE: "false",
  CONTROL_DATABASE_URL: "postgres://control/db",
  LMS_DATABASE_URL: "postgres://lms/db",
  REDIS_URL: "redis://redis:6379",
  S3_ENDPOINT: "https://storage.example",
  S3_REGION: "region",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
  S3_BUCKET_NAME: "demo",
  EMAIL_ADAPTER: "smtp",
  SMTP_HOST: "smtp.example",
  SMTP_EMAIL_FROM: "sender@example.test",
  MASTER_KEY: Buffer.alloc(32).toString("base64"),
  JWT_SECRET: "a".repeat(64),
  JWT_REFRESH_SECRET: "b".repeat(64),
  CORS_ORIGIN: "https://demo.example.test",
  GOOGLE_OAUTH_ENABLED: "false",
  MICROSOFT_OAUTH_ENABLED: "false",
  SLACK_OAUTH_ENABLED: "false",
});
test("accepts the explicit isolated demo profile", () =>
  assert.deepEqual(validateDemoEnvironment(valid()), []));
for (const [key, value] of Object.entries({
  DATABASE_URL: "postgres://owner/db",
  TEST_KEY: "test",
  DISABLE_RATE_LIMITING: "true",
  DEMONSTRATION_MODE: "false",
  RUN_STARTUP_MAINTENANCE: "true",
  CORS_ORIGIN: "http://demo.example.test",
  JWT_SECRET: "secret",
})) {
  test(`rejects unsafe ${key}`, () =>
    assert.ok(validateDemoEnvironment({ ...valid(), [key]: value }).some((x) => x.includes(key))));
}
test("does not print secrets in validation diagnostics", () => {
  const secret = "do-not-disclose";
  assert.ok(
    !validateDemoEnvironment({ ...valid(), JWT_SECRET: secret })
      .join()
      .includes(secret),
  );
});
