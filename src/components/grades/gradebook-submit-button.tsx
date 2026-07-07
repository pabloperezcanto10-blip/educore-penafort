"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function GradebookSubmitButton({
  children,
  pendingChildren = "Guardando...",
  className,
  disabled,
  name,
  value
}: {
  children: ReactNode;
  pendingChildren?: ReactNode;
  className: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className={className}
    >
      {pending ? pendingChildren : children}
    </button>
  );
}
