import Link from "next/link";
import { Eye, Search, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/database.types";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

type PageProps = {
  searchParams: {
    user_id?: string;
    action?: string;
    module?: string;
    entity_type?: string;
    date?: string;
    log_id?: string;
  };
};

type ProfileLabel = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

type LabeledAuditLog = AuditLog & {
  actorName: string;
};

const pageSize = 100;

export default async function AdminSecurityPage({ searchParams }: PageProps) {
  await requireRole("superadmin");
  const { logs, profiles, errorMessage } = await getAuditLogs(searchParams);
  const selectedLog = logs.find((log) => log.id === searchParams.log_id) ?? null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">Seguridad y auditoria</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Consulta cambios sensibles, accesos y acciones registradas.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </header>

      <AuditFilters profiles={profiles} searchParams={searchParams} />

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los logs de auditoria: {errorMessage}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <AuditLogTable logs={logs} searchParams={searchParams} />
          <AuditLogDetail log={selectedLog} />
        </div>
      )}
    </section>
  );
}

async function getAuditLogs(searchParams: PageProps["searchParams"]) {
  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("id,actor_user_id,actor_role,action,module,entity_type,entity_id,before_data,after_data,created_at")
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (searchParams.user_id) {
    query = query.eq("actor_user_id", searchParams.user_id);
  }

  if (searchParams.action) {
    query = query.eq("action", searchParams.action);
  }

  if (searchParams.module) {
    query = query.eq("module", searchParams.module);
  }

  if (searchParams.entity_type) {
    query = query.eq("entity_type", searchParams.entity_type);
  }

  if (searchParams.date) {
    query = query.gte("created_at", `${searchParams.date}T00:00:00.000Z`).lt("created_at", `${searchParams.date}T23:59:59.999Z`);
  }

  const { data, error } = await query.returns<AuditLog[]>();

  if (error) {
    return { logs: [], profiles: [], errorMessage: error.message };
  }

  const logs = data ?? [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .order("full_name", { ascending: true })
    .returns<ProfileLabel[]>();
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const labeledLogs: LabeledAuditLog[] = logs.map((log) => {
    const profile = log.actor_user_id ? profileMap.get(log.actor_user_id) : null;

    return {
      ...log,
      actorName: getProfileName(profile, log.actor_user_id)
    };
  });

  return { logs: labeledLogs, profiles: profiles ?? [], errorMessage: null };
}

function AuditFilters({
  profiles,
  searchParams
}: {
  profiles: ProfileLabel[];
  searchParams: PageProps["searchParams"];
}) {
  return (
    <form className="rounded-lg border border-border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Usuario</span>
          <select
            name="user_id"
            defaultValue={searchParams.user_id ?? ""}
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="">Todos</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {getProfileName(profile, profile.id)}
              </option>
            ))}
          </select>
        </label>

        <FilterInput name="action" label="Accion" defaultValue={searchParams.action} placeholder="grade_updated" />
        <FilterInput name="module" label="Modulo" defaultValue={searchParams.module} placeholder="gradebook" />
        <FilterInput name="entity_type" label="Entidad" defaultValue={searchParams.entity_type} placeholder="profile" />

        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Fecha</span>
          <input
            type="date"
            name="date"
            defaultValue={searchParams.date ?? ""}
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Filtrar
        </button>
        <Link
          href="/dashboard/admin/security"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium transition hover:bg-muted"
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}

function FilterInput({
  name,
  label,
  defaultValue,
  placeholder
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function AuditLogTable({
  logs,
  searchParams
}: {
  logs: LabeledAuditLog[];
  searchParams: PageProps["searchParams"];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Logs recientes</h2>
        <p className="text-sm text-muted-foreground">Ultimos {pageSize} registros segun filtros activos.</p>
      </div>

      {logs.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No hay logs para los filtros seleccionados.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Usuario actor</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium">Accion</th>
                <th className="px-4 py-3 text-left font-medium">Modulo</th>
                <th className="px-4 py-3 text-left font-medium">Entidad</th>
                <th className="px-4 py-3 text-left font-medium">Resumen</th>
                <th className="px-4 py-3 text-left font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className={log.id === searchParams.log_id ? "bg-secondary/40" : undefined}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(log.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{log.actorName}</td>
                  <td className="px-4 py-3">{log.actor_role ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-primary">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.module}</td>
                  <td className="px-4 py-3">{log.entity_type}</td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground">{summarizeJson(log.after_data ?? log.before_data)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={buildDetailHref(searchParams, log.id)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditLogDetail({ log }: { log: LabeledAuditLog | null }) {
  return (
    <aside className="rounded-lg border border-border bg-white p-4 xl:sticky xl:top-6 xl:h-fit">
      <h2 className="text-sm font-semibold text-foreground">Detalle del log</h2>
      {!log ? (
        <p className="mt-3 text-sm text-muted-foreground">Selecciona un registro para ver before_data y after_data.</p>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          <div className="grid gap-2 rounded-md bg-muted p-3">
            <DetailLine label="Fecha" value={formatDateTime(log.created_at)} />
            <DetailLine label="Usuario" value={log.actorName} />
            <DetailLine label="Rol" value={log.actor_role ?? "-"} />
            <DetailLine label="Accion" value={log.action} />
            <DetailLine label="Modulo" value={log.module} />
            <DetailLine label="Entidad" value={`${log.entity_type}${log.entity_id ? ` · ${log.entity_id}` : ""}`} />
          </div>

          <JsonBlock title="Before data" data={log.before_data} />
          <JsonBlock title="After data" data={log.after_data} />
        </div>
      )}
    </aside>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <p className="break-words text-foreground">{value}</p>
    </div>
  );
}

function JsonBlock({ title, data }: { title: string; data: Json | null }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
      <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-relaxed text-slate-50">
        {data ? JSON.stringify(data, null, 2) : "null"}
      </pre>
    </div>
  );
}

function getProfileName(profile: ProfileLabel | null | undefined, fallbackId: string | null) {
  if (!profile) {
    return fallbackId ?? "Sistema";
  }

  return profile.full_name || profile.email || profile.id;
}

function summarizeJson(data: Json | null) {
  if (!data) {
    return "-";
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    return String(data);
  }

  const entries = Object.entries(data).slice(0, 4);

  if (entries.length === 0) {
    return "{}";
  }

  return entries
    .map(([key, value]) => `${key}: ${formatJsonValue(value)}`)
    .join(" · ");
}

function formatJsonValue(value: Json | undefined) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "object") {
    return Array.isArray(value) ? `[${value.length}]` : "{...}";
  }

  return String(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function buildDetailHref(searchParams: PageProps["searchParams"], logId: string) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && key !== "log_id") {
      params.set(key, value);
    }
  });

  params.set("log_id", logId);
  return `/dashboard/admin/security?${params.toString()}`;
}
