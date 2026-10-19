import { memo } from "react";

import { usePlatformSimpleLogo } from "~/api/queries";
import { useCompanyInformationSuspense } from "~/api/queries/useCompanyInformationSuspense";
import { usePlatformLogo } from "~/hooks/usePlatformLogo";
import { cn } from "~/lib/utils";

interface PlatformLogoProps {
  className?: string;
  variant?: "full" | "signet";
  alt?: string;
}

export const PlatformLogo = memo(
  ({ className, variant = "full", alt = "Platform Logo" }: PlatformLogoProps) => {
    const { data: companyInformation } = useCompanyInformationSuspense();
    const brandName =
      companyInformation.data.applicationName ||
      companyInformation.data.companyShortName ||
      companyInformation.data.companyName ||
      "Utu Lab";
    const { data: customLogoUrl, isLoading } = usePlatformLogo();
    const { data: customSimpleLogoUrl, isLoading: isSimpleLogoLoading } = usePlatformSimpleLogo();

    if (isLoading) {
      return <div className={className}></div>;
    }

    if (customLogoUrl && !isLoading && variant === "full") {
      return (
        <img
          src={customLogoUrl}
          alt={alt}
          className={cn("object-contain", className)}
          loading="eager"
          decoding="async"
        />
      );
    }

    if (customSimpleLogoUrl && !isSimpleLogoLoading && variant === "signet") {
      return (
        <img
          src={customSimpleLogoUrl}
          alt={alt}
          className={cn("object-contain", className)}
          loading="eager"
          decoding="async"
        />
      );
    }

    if (variant === "signet") {
      return (
        <span className={cn("font-bold", className)} aria-label={brandName}>
          {brandName.slice(0, 1)}
        </span>
      );
    }

    return <span className={cn("font-bold", className)}>{brandName}</span>;
  },
);

PlatformLogo.displayName = "PlatformLogo";
