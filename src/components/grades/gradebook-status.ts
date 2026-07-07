import type { CalculatedStudentGrade, PartialGrade, TermSubjectGrade } from "@/lib/grades/grades";

export type GradebookStudentStatus = "ungraded" | "pending" | "completed" | "closed";

export function getCompletedCriteriaCount(criteriaCount: number, calculated?: CalculatedStudentGrade) {
  if (criteriaCount === 0 || !calculated) {
    return 0;
  }

  return Math.max(criteriaCount - calculated.missingCriteria.length, 0);
}

export function getStudentProgressLabel(criteriaCount: number, calculated?: CalculatedStudentGrade) {
  const completed = getCompletedCriteriaCount(criteriaCount, calculated);

  if (criteriaCount > 0 && completed === criteriaCount) {
    return "100% completado";
  }

  return `${completed}/${criteriaCount} criterios completados`;
}

export function getStudentProgressPercent(criteriaCount: number, calculated?: CalculatedStudentGrade) {
  if (criteriaCount === 0) {
    return 0;
  }

  return Math.round((getCompletedCriteriaCount(criteriaCount, calculated) / criteriaCount) * 100);
}

export function getGradebookStudentStatus({
  criteriaCount,
  calculated,
  termGrade,
  selectedGrade
}: {
  criteriaCount: number;
  calculated?: CalculatedStudentGrade;
  termGrade?: TermSubjectGrade;
  selectedGrade?: PartialGrade;
}): GradebookStudentStatus {
  if (termGrade?.status === "closed") {
    return "closed";
  }

  const completed = getCompletedCriteriaCount(criteriaCount, calculated);

  if (criteriaCount > 0 && completed === criteriaCount) {
    return "completed";
  }

  if (selectedGrade || completed > 0 || termGrade?.status === "draft") {
    return "pending";
  }

  return "ungraded";
}

export function getGradebookStatusLabel(status: GradebookStudentStatus) {
  const labels: Record<GradebookStudentStatus, string> = {
    ungraded: "Sin calificar",
    pending: "Pendiente",
    completed: "Completado",
    closed: "Cerrada"
  };

  return labels[status];
}

export function getGradebookStatusTone(status: GradebookStudentStatus): "blue" | "green" | "amber" | "gray" {
  const tones: Record<GradebookStudentStatus, "blue" | "green" | "amber" | "gray"> = {
    ungraded: "gray",
    pending: "amber",
    completed: "blue",
    closed: "green"
  };

  return tones[status];
}

export function formatGradeValue(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : Number(value).toFixed(2).replace(/\.00$/, "");
}
