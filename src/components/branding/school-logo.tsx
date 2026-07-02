"use client";

import Image from "next/image";
import { useState } from "react";

type SchoolLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-lg"
};

export function SchoolLogo({ size = "md", className = "" }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-primary text-center font-semibold text-primary-foreground ${sizeClasses[size]} ${className}`}
      aria-label="Logo Colegio Penafort"
    >
      <span className={failed ? "block" : "hidden"}>CP</span>
      {!failed ? (
        <Image
          src="/branding/penafort-logo.jpg"
          alt="Colegio Penafort"
          fill
          sizes="80px"
          className="bg-white object-contain"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}
