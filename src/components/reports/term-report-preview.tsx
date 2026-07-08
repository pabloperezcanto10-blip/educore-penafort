import Image from "next/image";
import type { TermReportData } from "@/lib/reports/term-report-pdf";
import { platformSettings, schoolSettings } from "@/lib/settings";

export function ReportCardTemplate({ report }: { report: TermReportData }) {
  const issuedAt = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long"
  }).format(new Date());
  const termLabel = `${report.term}.ª evaluación`;

  return (
    <article className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col bg-white px-[18mm] py-[16mm] text-slate-950 shadow-sm print:min-h-[273mm] print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <header className="border-b-2 border-slate-900 pb-7">
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-white p-2">
              <Image
                src="/branding/penafort-logo.jpg"
                alt="Logo Colegio Peñafort"
                width={72}
                height={72}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Boletín académico oficial</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{schoolSettings.name}</h1>
              <p className="mt-1 text-sm font-medium text-slate-600">Curso escolar {report.academicYearName}</p>
            </div>
          </div>
          <div className="min-w-40 border-l border-slate-200 pl-5 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Evaluación</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{termLabel}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">Fecha de emisión<br />{issuedAt}</p>
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Datos del alumno</h2>
        <dl className="mt-3 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
          <ReportInfo label="Alumno" value={report.studentName} />
          <ReportInfo label="Curso" value={report.courseName} />
          <ReportInfo label="Tutor" value="No disponible" />
          <ReportInfo label="Evaluación" value={termLabel} />
          <ReportInfo label="Curso escolar" value={report.academicYearName} />
          <ReportInfo label="Fecha de emisión" value={issuedAt} />
        </dl>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Calificaciones</h2>
            <p className="mt-1 text-sm text-slate-500">Asignaturas, nota final y observación final registrada.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {report.rows.length} materia{report.rows.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 text-left text-slate-800">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em]">Asignatura</th>
                <th className="w-28 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em]">Nota</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em]">Observación final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                    Sin calificaciones registradas.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.subjectName} className="align-top">
                    <td className="px-4 py-4 font-semibold text-slate-950">{row.subjectName}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-slate-950">
                        {row.finalGrade}
                      </span>
                    </td>
                    <td className="px-4 py-4 leading-6 text-slate-600">
                      {row.finalObservation || "Sin observación registrada."}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-slate-700">{schoolSettings.name}</p>
            <p>Boletín emitido el {issuedAt}. Página 1 de 1.</p>
          </div>
          <p className="text-right text-slate-400">Powered by {platformSettings.name}</p>
        </div>
      </footer>
    </article>
  );
}

export const TermReportPreview = ReportCardTemplate;

function ReportInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}
