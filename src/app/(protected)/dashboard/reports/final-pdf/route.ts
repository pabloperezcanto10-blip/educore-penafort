import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { generateFinalReportPdf, getFinalReportForProfile } from "@/lib/reports/final-report-pdf";

export async function GET(request: Request) {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active) {
    return new NextResponse("No hay sesión activa.", { status: 401 });
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("student_id") ?? "";

  if (!studentId) {
    return new NextResponse("Falta alumno.", { status: 400 });
  }

  const { report, errorMessage, status } = await getFinalReportForProfile({
    profile,
    studentId
  });

  if (!report) {
    return new NextResponse(errorMessage ?? "No se pudo generar el boletín final.", { status });
  }

  const pdf = generateFinalReportPdf(report);
  const filename = `boletin-final-${slugify(report.studentName)}.pdf`;

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
