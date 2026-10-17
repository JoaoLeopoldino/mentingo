import {
  DASHBOARD_SCHEMA_VERSION,
  DASHBOARD_WIDGET_SIZES,
  DASHBOARD_WIDGET_TYPES,
} from "@repo/shared";
import { Value } from "@sinclair/typebox/value";

import { dashboardSettingsSchema, studentSettingsJSONContentSchema } from "./settings.schema";

describe("semantic dashboard settings validation", () => {
  it("accepts a canonical layout with a revision", () => {
    expect(
      Value.Check(dashboardSettingsSchema, {
        schemaVersion: DASHBOARD_SCHEMA_VERSION,
        revision: 4,
        widgets: [
          {
            type: DASHBOARD_WIDGET_TYPES.EVENT_CALENDAR,
            size: DASHBOARD_WIDGET_SIZES.TWO_BY_TWO,
            visible: true,
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects legacy IDs and numeric widths in the semantic layout", () => {
    expect(
      Value.Check(dashboardSettingsSchema, {
        schemaVersion: DASHBOARD_SCHEMA_VERSION,
        revision: 0,
        widgets: [{ type: "s_event_calendar", size: 2, visible: true }],
      }),
    ).toBe(false);
  });

  it("rejects the obsolete staging schema version", () => {
    expect(
      Value.Check(dashboardSettingsSchema, {
        schemaVersion: 1,
        revision: 4,
        widgets: [],
      }),
    ).toBe(false);
  });
});

describe("interface language settings", () => {
  it("accepts canonical Angola Portuguese for persistent user settings", () => {
    expect(Value.Check(studentSettingsJSONContentSchema.properties.language, "pt-AO")).toBe(true);
  });

  it("rejects unknown languages and unnormalized regional aliases", () => {
    for (const language of ["zz", "pt-PT", "pt_ao"]) {
      expect(Value.Check(studentSettingsJSONContentSchema.properties.language, language)).toBe(
        false,
      );
    }
  });
});
