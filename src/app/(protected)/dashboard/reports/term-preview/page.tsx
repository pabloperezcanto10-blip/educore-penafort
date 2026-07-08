import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";
import type { GradeTerm } from "@/lib/grades/grades";
import { getTermReportForProfile } from "@/lib/reports/term-report-pdf";
import { TermReportPreview } from "@/components/reports/term-report-preview";
import { ReportPrintButton } from "@/components/reports/report-print-button";

type TermPreviewPageProps = {
  searchParams: {
    student_id?: string;
    term?: string;
  };
};

export default async function TermPreviewPage({ searchParams }: TermPreviewPageProps) {
  const profile = await getCurrentUserProfile();
  const studentId = searchParams.student_id ?? "";
  const term = normalizeTerm(searchParams.term);

  if (!profile || !profile.active) {
    return <PreviewError message="No hay sesión activa." />;
  }

  if (!studentId || !term) {
    return <PreviewError message="Faltan alumno o trimestre." />;
  }

  const { report, errorMessage } = await getTermReportForProfile({
    profile,
    studentId,
    term
  });

  if (!report) {
    return <PreviewError message={errorMessage ?? "No se pudo generar la vista previa del boletín."} />;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <style>
        {`@media print {
          body > div > header,
          body > div > div > aside {
            display: none !important;
          }
          body > div,
          body > div > div,
          body > div > div > main {
            background: white !important;
            display: block !important;
            max-width: none !important;
            padding: 0 !important;
            width: 100% !important;
          }
          @page {
            margin: 12mm;
            size: A4;
          }
        }`}
      </style>
      <div className="mx-auto mb-5 flex max-w-[210mm] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">Vista previa del boletín</p>
          <p className="mt-1 text-xs text-slate-500">Revisa el documento antes de descargarlo o publicarlo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReportPrintButton />
          <Link
            href={`/dashboard/reports/term-pdf?student_id=${studentId}&term=${term}`}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Descargar PDF
          </Link>
        </div>
      </div>
      <TermReportPreview report={report} />
    </main>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700 shadow-sm">
        {message}
      </section>
    </main>
  );
}

function normalizeTerm(value: string | undefined): GradeTerm | null {
  return value === "1" || value === "2" || value === "3" ? value : null;
}
