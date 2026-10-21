import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

import type {
  GetCompanyInformationResponse,
  UpdateCompanyInformationBody,
} from "~/api/generated-api";

const companyInformationFormSchema = z
  .object({
    companyName: z.string().optional(),
    applicationName: z
      .string()
      .trim()
      .min(1, "providerInformation.validation.brandingNameRequired")
      .max(120, "providerInformation.validation.brandingNameTooLong"),
    certificateIssuer: z
      .string()
      .trim()
      .min(1, "providerInformation.validation.brandingNameRequired")
      .max(160, "providerInformation.validation.brandingNameTooLong"),
    emailSenderName: z
      .string()
      .trim()
      .min(1, "providerInformation.validation.brandingNameRequired")
      .max(120, "providerInformation.validation.brandingNameTooLong"),
    companyShortName: z
      .string()
      .max(10, "Company short name must be 10 characters or less")
      .optional(),
    registeredAddress: z.string().optional(),
    taxNumber: z
      .string()
      .regex(/^\d{10}$/)
      .optional()
      .or(z.literal("")),
    emailAddress: z.string().email().optional().or(z.literal("")),
    linkedinOrganizationId: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .or(z.literal("")),
    courtRegisterNumber: z
      .string()
      .regex(/^\d{10}$/)
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.companyName && data.companyShortName && data.companyShortName.trim() !== "") {
        return data.companyShortName.length <= data.companyName.length;
      }
      return true;
    },
    {
      message: "Company short name must be shorter than or equal to company name",
      path: ["companyShortName"],
    },
  );

export interface ProviderInformationEditCardProps {
  companyInformation: GetCompanyInformationResponse["data"] | null;
  onSubmit: (data: UpdateCompanyInformationBody) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ProviderInformationEditCard = ({
  companyInformation,
  onSubmit,
  onCancel,
  isLoading,
}: ProviderInformationEditCardProps) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateCompanyInformationBody>({
    resolver: zodResolver(companyInformationFormSchema),
    defaultValues: {
      companyName: "",
      companyShortName: "",
      registeredAddress: "",
      taxNumber: "",
      emailAddress: "",
      courtRegisterNumber: "",
      linkedinOrganizationId: "",
      ...companyInformation,
      applicationName:
        companyInformation?.applicationName || companyInformation?.companyName || "Utu Lab",
      certificateIssuer:
        companyInformation?.certificateIssuer || companyInformation?.companyName || "Utu Lab",
      emailSenderName:
        companyInformation?.emailSenderName || companyInformation?.companyName || "Utu Lab",
    },
  });

  return (
    <section className="flex w-full max-w-[720px] flex-col gap-y-6 rounded-b-lg rounded-t-2xl bg-white p-6 drop-shadow">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">{t("providerInformation.companyName")}</Label>
          <Input
            id="companyName"
            className={cn({
              "border-red-500 focus:!ring-red-500": errors.companyName,
            })}
            {...register("companyName")}
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-500">{errors.companyName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyShortName">{t("providerInformation.companyShortName")}</Label>
          <Input
            id="companyShortName"
            maxLength={10}
            className={cn({
              "border-red-500 focus:!ring-red-500": errors.companyShortName,
            })}
            {...register("companyShortName")}
          />
          {errors.companyShortName && (
            <p className="mt-1 text-xs text-red-500">{errors.companyShortName.message}</p>
          )}
        </div>

        {(["applicationName", "certificateIssuer", "emailSenderName"] as const).map((field) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={field}>{t(`providerInformation.${field}`)}</Label>
            <Input
              id={field}
              maxLength={field === "certificateIssuer" ? 160 : 120}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `${field}-error` : undefined}
              className={cn({ "border-red-500 focus:!ring-red-500": errors[field] })}
              {...register(field)}
            />
            {errors[field] && (
              <p id={`${field}-error`} className="mt-1 text-xs text-red-500">
                {t(errors[field]?.message || "providerInformation.validation.brandingNameRequired")}
              </p>
            )}
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="registeredAddress">{t("providerInformation.registeredAddress")}</Label>
          <Textarea
            id="registeredAddress"
            className={cn({
              "border-red-500 focus:!ring-red-500": errors.registeredAddress,
            })}
            {...register("registeredAddress")}
          />
          {errors.registeredAddress && (
            <p className="mt-1 text-xs text-red-500">{errors.registeredAddress.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxNumber">{t("providerInformation.taxNumber")}</Label>
          <Input
            id="taxNumber"
            placeholder="1234567890"
            className={cn({
              "border-red-500 focus:!ring-red-500": errors.taxNumber,
            })}
            {...register("taxNumber")}
          />
          {errors.taxNumber && (
            <p className="mt-1 text-xs text-red-500">
              {t("providerInformation.validation.nipMustBe10Digits")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailAddress">{t("providerInformation.emailAddress")}</Label>
          <Input
            id="emailAddress"
            type="email"
            className={cn({
              "border-red-500 focus:!ring-red-500": errors.emailAddress,
            })}
            {...register("emailAddress")}
          />
          {errors.emailAddress && (
            <p className="mt-1 text-xs text-red-500">
              {t("providerInformation.validation.invalidEmailFormat")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="courtRegisterNumber">
            {t("providerInformation.courtRegisterNumber")}
          </Label>
          <Input
            id="courtRegisterNumber"
            placeholder="0000123456"
            className={cn({
              "border-red-500 focus:!ring-red-500": errors.courtRegisterNumber,
            })}
            {...register("courtRegisterNumber")}
          />
          {errors.courtRegisterNumber && (
            <p className="mt-1 text-xs text-red-500">
              {t("providerInformation.validation.krsMustBe10Digits")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedinOrganizationId">
            {t("providerInformation.linkedinOrganizationId")}
          </Label>
          <Input
            id="linkedinOrganizationId"
            placeholder="1234567"
            className={cn({
              "border-red-500 focus:!ring-red-500": errors.linkedinOrganizationId,
            })}
            {...register("linkedinOrganizationId")}
          />
          <p className="text-xs text-gray-500">
            {t("providerInformation.linkedinOrganizationIdHint")}
          </p>
          {errors.linkedinOrganizationId && (
            <p className="mt-1 text-xs text-red-500">
              {t("providerInformation.validation.linkedinOrganizationIdMustBeNumeric")}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("common.button.saving") : t("common.button.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {t("common.button.cancel")}
          </Button>
        </div>
      </form>
    </section>
  );
};
