"use client";

import { useState } from "react";
import type { DemoCompanyBrand } from "@/lib/demoCompanies";

type CompanyLogoProps = {
  brand: DemoCompanyBrand;
  size?: "sm" | "md" | "lg";
};

export function CompanyLogo({ brand, size = "md" }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = brand.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className={`company-logo company-logo-${size}`} aria-label={brand.name}>
      {!failed ? (
        <img
          alt=""
          src={brand.logoUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <strong>{initials}</strong>
      )}
    </span>
  );
}
