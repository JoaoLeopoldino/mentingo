import { EmailService } from "./emails.service";

import type { EmailAdapter } from "./adapters/email.adapter";
import type { ConfigService } from "@nestjs/config";
import type { DatabasePg } from "src/common";
import type { SettingsService } from "src/settings/settings.service";
import type { TenantDbRunnerService } from "src/storage/db/tenant-db-runner.service";

describe.each(["mailhog", "smtp"])("EmailService shared branded transport (%s)", (adapter) => {
  const sendMail = jest.fn();
  const logo = Buffer.from("logo");
  const borderCircle = Buffer.from("border-circle");
  const companyInformation: { emailSenderName?: string } = {};
  const service = new EmailService(
    {} as DatabasePg,
    { sendMail } as EmailAdapter,
    {
      getCompanyInformation: async () => companyInformation,
      getPlatformLogoBuffer: async () => logo,
      getEmailBorderCircleBuffer: async () => borderCircle,
    } as unknown as SettingsService,
    { runWithTenant: async (_id, callback) => callback() } as TenantDbRunnerService,
    {
      get: (key: string) => (key === "email.SMTP_EMAIL_FROM" ? "sender@example.com" : adapter),
    } as ConfigService,
  );
  const email = {
    to: "learner@example.com",
    subject: "Rendered content",
    text: "Rendered text",
    html: '<img src="cid:logo"><img src="cid:border-circle">',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    delete companyInformation.emailSenderName;
  });
  it("preserves already rendered content, recipient and inline assets while attaching tenant branding", async () => {
    const asset = { filename: "image.png", content: Buffer.from("image"), cid: "image" };
    await service.sendEmailWithLogo({ ...email, attachments: [asset] }, { tenantId: "tenant-id" });
    expect(sendMail).toHaveBeenCalledWith({
      ...email,
      from: "sender@example.com",
      attachments: [
        asset,
        expect.objectContaining({ cid: "logo", content: logo }),
        expect.objectContaining({ cid: "border-circle", content: borderCircle }),
      ],
    });
  });
  it("labels transmitted demo email in both HTML and text", async () => {
    const previous = process.env.DEMONSTRATION_MODE;
    process.env.DEMONSTRATION_MODE = "true";
    try {
      await service.sendEmailWithLogo(email, { tenantId: "tenant-id" });
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "[DEMONSTRAÇÃO] Rendered content",
          html: expect.stringContaining("Ambiente de Demonstração"),
          text: expect.stringContaining("Ambiente de Demonstração"),
        }),
      );
    } finally {
      if (previous === undefined) delete process.env.DEMONSTRATION_MODE;
      else process.env.DEMONSTRATION_MODE = previous;
    }
  });
  it("uses a tenant display sender while retaining the authorized SMTP address", async () => {
    companyInformation.emailSenderName = "Formação Utu";
    await service.sendEmailWithLogo(email, { tenantId: "tenant-id" });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: '\"Formação Utu\" <sender@example.com>' }),
    );
  });
  it("embeds the decorative branding image in browser previews", async () => {
    expect(await service.getEmailPreviewBorderCircle("tenant-id")).toBe(
      `data:image/png;base64,${borderCircle.toString("base64")}`,
    );
  });
  it("propagates transport errors so callers can retry", async () => {
    sendMail.mockRejectedValueOnce(new Error("Provider temporarily unavailable"));
    await expect(service.sendEmailWithLogo(email, { tenantId: "tenant-id" })).rejects.toThrow(
      "Provider temporarily unavailable",
    );
  });
});
