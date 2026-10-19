import database from "./database";

describe("managed database credentials", () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.RUN_STARTUP_MAINTENANCE = "false";
    delete process.env.DATABASE_URL;
    delete process.env.MIGRATOR_DATABASE_URL;
    delete process.env.CONTROL_DATABASE_URL;
    delete process.env.LMS_DATABASE_URL;
  });
  afterEach(() => {
    process.env = { ...original };
  });
  it("refuses ambiguous fallback credentials", () => {
    process.env.DATABASE_URL = "postgres://owner/secret";
    expect(() => database()).toThrow("Managed runtime requires");
  });
  it("refuses a migration credential even if separate runtime URLs exist", () => {
    process.env.CONTROL_DATABASE_URL = "postgres://control/db";
    process.env.LMS_DATABASE_URL = "postgres://lms/db";
    process.env.MIGRATOR_DATABASE_URL = "postgres://owner/db";
    expect(() => database()).toThrow("must not be present");
  });
  it("resolves the explicit application and control roles", () => {
    process.env.CONTROL_DATABASE_URL = "postgres://control/db";
    process.env.LMS_DATABASE_URL = "postgres://lms/db";
    expect(database()).toEqual({ urlApp: "postgres://lms/db", urlAdmin: "postgres://control/db" });
  });
});
