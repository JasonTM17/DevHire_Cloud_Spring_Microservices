"use client";

import Image from "next/image";
import { useState } from "react";
import type { DemoCompanyBrand } from "@/lib/demoCompanies";

type CompanyLogoProps = {
  brand: DemoCompanyBrand;
  size?: "sm" | "md" | "lg";
};

const sizeMap = { sm: 24, md: 32, lg: 44 } as const;

export function CompanyLogo({ brand, size = "md" }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = brand.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const px = sizeMap[size];

  return (
    <span className={`company-logo company-logo-${size}`} aria-label={brand.name}>
      {!failed ? (
        <Image
          alt=""
          src={brand.logoUrl}
          width={px}
          height={px}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        <strong>{initials}</strong>
      )}
    </span>
  );
}
