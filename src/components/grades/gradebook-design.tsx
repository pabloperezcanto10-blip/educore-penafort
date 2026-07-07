import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function GradebookCard({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function GradebookCardHeader({
  title,
  children
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <h2 className="flex-1 text-[15px] font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

export function GradebookBadge({
  tone = "gray",
  children
}: {
  tone?: "blue" | "green" | "amber" | "red" | "gray";
  children: ReactNode;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-800",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    gray: "bg-slate-100 text-slate-600"
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 ${toneClass}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillClass = clamped === 100 ? "bg-emerald-600" : clamped >= 50 ? "bg-amber-500" : clamped > 0 ? "bg-red-500" : "bg-slate-300";

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all ${fillClass}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 110 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox="0 0 110 110" className="-rotate-90">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="9" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="#16a34a"
          strokeLinecap="round"
          strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-lg font-bold text-slate-900">{Math.round(clamped)}%</span>
    </div>
  );
}

export function StudentAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-800 text-xs font-semibold tracking-wide text-white">
      {initials || "AL"}
    </span>
  );
}

export function IconStat({
  icon: Icon,
  value,
  label,
  tone = "green"
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tone?: "green" | "amber" | "slate";
}) {
  const toneClass = {
    green: "text-emerald-600",
    amber: "text-amber-600",
    slate: "text-slate-400"
  }[tone];

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-5 w-5 ${toneClass}`} aria-hidden="true" />
      <div>
        <div className="text-xl font-bold leading-none text-slate-900">{value}</div>
        <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export function ToggleSwitch({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <label className="relative inline-flex h-6 w-11 items-center">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-blue-700" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </label>
  );
}


