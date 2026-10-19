import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProviderInformationEditCard } from "./ProviderInformationEditCard";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("ProviderInformationEditCard branding", () => {
  it("submits the three tenant branding names through the existing form", async () => {
    const onSubmit = vi.fn();
    render(
      <ProviderInformationEditCard
        companyInformation={{ companyName: "Unidade Fictícia" }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isLoading={false}
      />,
    );
    for (const [field, value] of Object.entries({
      applicationName: "Formação Utu",
      certificateIssuer: "Centro Fictício",
      emailSenderName: "Equipa de Formação",
    })) {
      fireEvent.change(screen.getByLabelText(`providerInformation.${field}`), {
        target: { value },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "common.button.save" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationName: "Formação Utu",
          certificateIssuer: "Centro Fictício",
          emailSenderName: "Equipa de Formação",
          companyName: "Unidade Fictícia",
        }),
        expect.anything(),
      ),
    );
  });
  it("keeps configured branding values when editing other company information", async () => {
    const onSubmit = vi.fn();
    render(
      <ProviderInformationEditCard
        companyInformation={{
          applicationName: "Formação",
          certificateIssuer: "Emissor original",
          emailSenderName: "Remetente original",
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isLoading={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("providerInformation.companyName"), {
      target: { value: "Outra unidade" },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.button.save" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationName: "Formação",
          certificateIssuer: "Emissor original",
          emailSenderName: "Remetente original",
        }),
        expect.anything(),
      ),
    );
  });
  it("rejects an empty issuer with an accessible localized error", async () => {
    const onSubmit = vi.fn();
    render(
      <ProviderInformationEditCard
        companyInformation={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isLoading={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("providerInformation.certificateIssuer"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.button.save" }));
    expect(
      await screen.findByText("providerInformation.validation.brandingNameRequired"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("providerInformation.certificateIssuer")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
