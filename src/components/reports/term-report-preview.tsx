import Image from "next/image";
import type { TermReportData } from "@/lib/reports/term-report-pdf";
import { platformSettings, schoolSettings } from "@/lib/settings";

export function ReportCardTemplate({ report }: { report: TermReportData }) {
  const issuedAt = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long"
  }).format(new Date());
  const footerDate = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date());
  const termLabel = `${report.term}.ª evaluación`;

  return (
    <article className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col bg-white px-[18mm] py-[16mm] text-slate-950 shadow-sm print:min-h-[273mm] print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <header className="pb-5">
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-center gap-4">
            <Image
              src="/branding/penafort-logo.jpg"
              alt="Logo Colegio Peñafort"
              width={58}
              height={58}
              className="h-14 w-14 object-contain"
              priority
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">{schoolSettings.name}</h1>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Boletín de Calificaciones
              </p>
              <p className="mt-1 text-sm text-slate-600">Curso escolar {report.academicYearName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Evaluación</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{termLabel}</p>
            <p className="mt-2 text-xs text-slate-500">Fecha de emisión: {issuedAt}</p>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-300 pt-4">
          <p className="text-sm leading-6 text-slate-700">
            <span className="font-semibold text-slate-950">Alumno:</span> {report.studentName}
            <span className="mx-3 text-slate-300">|</span>
            <span className="font-semibold text-slate-950">Curso:</span> {report.courseName}
          </p>
        </div>
      </header>

      <section className="mt-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300 text-left text-slate-800">
              <th className="py-3 pr-4 text-xs font-bold uppercase tracking-[0.12em]">Asignatura</th>
              <th className="w-32 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em]">Calificación</th>
              <th className="py-3 pl-4 text-xs font-bold uppercase tracking-[0.12em]">Observación final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-sm font-medium text-slate-500">
                  Sin calificaciones registradas.
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr key={row.subjectName} className="align-top">
                  <td className="py-4 pr-4 font-semibold text-slate-950">{row.subjectName}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex min-w-10 justify-center text-base font-bold tabular-nums text-slate-950">
                      {row.finalGrade}
                    </span>
                  </td>
                  <td className="py-4 pl-4 leading-6 text-slate-600">
                    {row.finalObservation || "Sin observación registrada."}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <footer className="mt-auto border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-slate-700">{schoolSettings.name}</p>
            <p>Boletín emitido el {footerDate}. Página 1 de 1.</p>
          </div>
          <p className="text-right text-[10px] text-slate-400">Powered by {platformSettings.name}</p>
        </div>
      </footer>
    </article>
  );
}

export const TermReportPreview = ReportCardTemplate;
