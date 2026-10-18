import { useTranslation } from "react-i18next";

import { cn } from "~/lib/utils";

import type { FormHTMLAttributes, ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      {label}
      {children}
    </label>
  );
}
export function Picker({
  name,
  label,
  options,
  optional = false,
}: {
  name: string;
  label: string;
  options: { id: string; name: string }[];
  optional?: boolean;
}) {
  return (
    <Field label={label}>
      <select
        name={name}
        aria-label={label}
        required={!optional}
        className="h-10 w-full min-w-0 max-w-full rounded border bg-background px-3"
        defaultValue=""
      >
        <option value="">—</option>
        {options.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
export const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
export const optionalDate = (data: FormData, key: string) =>
  value(data, key) ? new Date(value(data, key)).toISOString() : null;

export function BusyForm({
  busy,
  children,
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & { busy: boolean }) {
  const { t } = useTranslation();
  const control = (target: EventTarget | null) =>
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement;
  return (
    <form
      {...props}
      className={cn("min-w-0", className)}
      onInvalidCapture={(event) => {
        if (control(event.target))
          (event.target as HTMLInputElement).setCustomValidity(
            t("competencies.errors.invalidForm"),
          );
      }}
      onInputCapture={(event) => {
        if (control(event.target)) (event.target as HTMLInputElement).setCustomValidity("");
      }}
    >
      <fieldset disabled={busy} className="m-0 grid min-w-0 gap-3 border-0 p-0">
        {children}
      </fieldset>
    </form>
  );
}
