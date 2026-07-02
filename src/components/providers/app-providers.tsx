"use client";

import { Suspense } from "react";
import { GlobalToast } from "@/components/ui/global-toast";

export function AppProviders() {
  return (
    <Suspense fallback={null}>
      <GlobalToast />
    </Suspense>
  );
}
