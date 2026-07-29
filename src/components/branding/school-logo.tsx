"use client";

import Image from "next/image";
import { useState } from "react";

type SchoolLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  src?: string;
  name?: string;
  initials?: string;
};

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-lg"
};

export function SchoolLogo({
  size = "md",
  className = "",
  src = "/branding/penafort-logo.jpg",
  name = "Colegio Peñafort",
  initials = "CP"
}: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-primary text-center font-semibold text-primary-foreground ${sizeClasses[size]} ${className}`}
      aria-label={`Logo ${name}`}
    >
      <span className={failed ? "block" : "hidden"}>{initials}</span>
      {!failed ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes="80px"
          className="bg-white object-contain"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}
