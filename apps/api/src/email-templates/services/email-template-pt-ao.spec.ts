import {
  EMAIL_TEMPLATE_DEFINITIONS_BY_EVENT,
  EMAIL_SUBJECTS_TRANSLATIONS,
  renderEmailTemplate,
  getBuiltInTemplatePublication,
  getBuiltInTemplateEvent,
} from "@repo/email-templates";

const events = [
  "welcome",
  "password_recovery",
  "password_reminder",
  "user_invite",
  "user_assigned_to_course",
  "certificate_expiration_warning",
  "certificate_expired",
  "user_finished_course",
  "magic_link",
] as const;

describe("Angola essential transactional email content", () => {
  it.each(events)("renders %s in pt-AO with intact variables and branding", (event) => {
    const definition = EMAIL_TEMPLATE_DEFINITIONS_BY_EVENT[event];
    expect(definition).toBeDefined();
    const variables = Object.fromEntries(definition.variables.map((v) => [v.key, v.sampleValue]));
    const ao = renderEmailTemplate({
      event,
      document: definition.defaultDocuments["pt-AO"],
      subject: definition.subjects["pt-AO"],
      variables: { ...variables, company_name: "Utu Demo" },
      branding: { companyName: "Utu Demo", primaryColor: "#4796fd" },
    });
    expect(ao.text).toContain("Disponibilizado por Utu Demo");
    expect(ao.text).not.toMatch(/Password|Your|You've|OPEN COURSE|Powered by|{{\s*\w+\s*}}/);
    expect(JSON.stringify(definition.defaultDocuments["pt-AO"])).not.toBe(
      JSON.stringify(definition.defaultDocuments.en),
    );
    expect(definition.subjects["pt-AO"]).not.toBe(definition.subjects.en);
  });

  it("provides Portuguese subjects and preserves all subject placeholders", () => {
    for (const translations of Object.values(EMAIL_SUBJECTS_TRANSLATIONS)) {
      expect(translations["pt-AO"]).not.toBe(translations.en);
      const tokens = (s: string) => [...s.matchAll(/{{.*?}}/g)].map((x) => x[0]).sort();
      expect(tokens(translations["pt-AO"])).toEqual(tokens(translations.en));
    }
  });
});

describe("Angola runtime built-in publication variants", () => {
  it.each([
    "assignment_with_deadline",
    "assignment_without_deadline",
    "completion_with_certificate",
    "completion_without_certificate",
    "certificate_manually_reset",
    "certificate_naturally_expired",
  ] as const)("renders %s with Portuguese content and footer", (key) => {
    const publication = getBuiltInTemplatePublication(key);
    const rendered = renderEmailTemplate({
      event: getBuiltInTemplateEvent(key),
      document: publication.content["pt-AO"]!,
      subject: publication.subject["pt-AO"]!,
      variables: Object.fromEntries([
        ...publication.placeholders.map((p) => [p.name, p.sampleValue]),
        ["company_name", "Utu Demo"],
      ]),
      branding: { companyName: "Utu Demo", primaryColor: "#4796fd" },
    });
    expect(rendered.text).toContain("Disponibilizado por Utu Demo");
    expect(rendered.text).not.toMatch(/Your|You've|OPEN COURSE|Powered by|{{\s*\w+\s*}}/);
    expect(rendered.text).toMatch(/curso|certificado/);
  });
});
