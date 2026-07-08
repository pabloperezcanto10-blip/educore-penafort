"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Center = {
  id: string;
  name: string;
  location: string;
  verified?: boolean;
  href: string;
};

const LAST_CENTER_KEY = "educore:last-center";

export function EduCoreCenterLauncher({ centers }: { centers: Center[] }) {
  const [lastCenterId, setLastCenterId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastCenterId(window.localStorage.getItem(LAST_CENTER_KEY));
    } catch {
      setLastCenterId(null);
    }
  }, []);

  const orderedCenters = lastCenterId
    ? [...centers].sort((left, right) => {
        if (left.id === lastCenterId) return -1;
        if (right.id === lastCenterId) return 1;
        return 0;
      })
    : centers;

  const rememberCenter = (centerId: string) => {
    try {
      window.localStorage.setItem(LAST_CENTER_KEY, centerId);
    } catch {
      // The launcher still works if storage is unavailable.
    }
  };

  return (
    <div className="mt-10 grid gap-4">
      {orderedCenters.map((center) => (
        <Link
          href={center.href}
          key={center.id}
          onClick={() => rememberCenter(center.id)}
          className="group flex flex-col gap-5 rounded-3xl border border-[#E7EBEE] bg-[#F6F3EC]/70 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_55px_rgba(15,27,46,0.10)] sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <span className="flex items-center gap-4">
            <Image
              src="/brand/educore/app-icon-light.svg"
              alt=""
              width={512}
              height={512}
              className="h-16 w-16 rounded-2xl shadow-[0_12px_28px_rgba(15,27,46,0.10)]"
            />
            <span>
              <span className="flex flex-wrap items-center gap-2">
                <strong className="block text-xl font-semibold tracking-[-0.035em] text-[#0F1B2E]">
                  {center.name}
                </strong>
                {center.verified ? (
                  <span className="inline-flex rounded-full bg-[#2F8A70]/10 px-3 py-1 text-xs font-semibold text-[#1D6F5B]">
                    Centro verificado
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-sm font-medium text-[#6B737C]">
                {center.location}
                {center.verified ? " · Centro verificado" : ""}
              </span>
            </span>
          </span>
          <span className="inline-flex h-12 min-w-36 items-center justify-center rounded-full bg-[#0F1B2E] px-7 text-sm font-semibold text-white transition group-hover:bg-[#1D3045]">
            Entrar
          </span>
        </Link>
      ))}
    </div>
  );
}
