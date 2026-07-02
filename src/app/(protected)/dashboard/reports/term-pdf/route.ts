import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { generateTermReportPdf, getTermReportForProfile } from "@/lib/reports/term-report-pdf";
import type { GradeTerm } from "@/lib/grades/grades";

export async function GET(request: Request) {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active) {
    return new NextResponse("No hay sesión activa.", { status: 401 });
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("student_id") ?? "";
  const term = normalizeTerm(url.searchParams.get("term"));

  if (!studentId || !term) {
    return new NextResponse("Faltan alumno o trimestre.", { status: 400 });
  }

  const { report, errorMessage, status } = await getTermReportForProfile({
    profile,
    studentId,
    term
  });

  if (!report) {
    return new NextResponse(errorMessage ?? "No se pudo generar el boletín.", { status });
  }

  const pdf = generateTermReportPdf(report);
  const filename = `boletin-${slugify(report.studentName)}-trimestre-${term}.pdf`;

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}

function normalizeTerm(value: string | null): GradeTerm | null {
  return value === "1" || value === "2" || value === "3" ? value : null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
