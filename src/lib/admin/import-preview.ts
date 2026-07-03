import { getAdminProfiles, getAdminStudents, type AdminProfile, type AdminStudent } from "@/lib/admin/admin";

export type ImportPreviewStatus = "nuevo" | "duplicado" | "error";

export type ImportPreviewRow = {
  id: string;
  raw: string;
  studentName: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  familyEmail: string;
  temporaryPassword: string;
  status: ImportPreviewStatus;
  reason: string;
};

export type ImportPreviewSummary = {
  nuevos: number;
  duplicados: number;
  errores: number;
};

export const importTemporaryPassword = "Penafort2026!";

export function normalizeForEmail(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "n")
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, ".")
    .replace(/\.+/g, ".");
}

export function parseStudentLine(rawLine: string) {
  const cleaned = rawLine.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(" ").filter(Boolean);

  if (parts.length < 3) {
    return null;
  }

  const lastName2 = parts.at(-1) ?? "";
  const lastName1 = parts.at(-2) ?? "";
  const firstName = parts.slice(0, -2).join(" ");

  return {
    studentName: cleaned,
    firstName,
    lastName1,
    lastName2,
    familyEmail: `familia.${normalizeForEmail(lastName1)}.${normalizeForEmail(lastName2)}@penafort.com`
  };
}

export async function buildImportPreview({
  courseId,
  rawList
}: {
  courseId: string;
  rawList: string;
}): Promise<{
  rows: ImportPreviewRow[];
  summary: ImportPreviewSummary;
  errorMessage: string | null;
}> {
  const [{ students, errorMessage: studentsError }, { profiles, errorMessage: profilesError }] = await Promise.all([
    getAdminStudents(),
    getAdminProfiles()
  ]);

  const errorMessage = studentsError ?? profilesError;
  if (errorMessage) {
    return {
      rows: [],
      summary: { nuevos: 0, duplicados: 0, errores: 0 },
      errorMessage
    };
  }

  const existingStudentKeys = new Set(
    students
      .filter((student) => student.course_id === courseId)
      .map((student) => getStudentKey(student.name, student.last_name))
  );
  const existingEmails = new Set(
    profiles
      .map((profile) => normalizeProfileEmail(profile))
      .filter((email): email is string => Boolean(email))
  );
  const seenStudentKeys = new Set<string>();
  const seenEmails = new Set<string>();

  const rows = rawList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsed = parseStudentLine(line);

      if (!parsed) {
        return createPreviewRow({
          id: String(index),
          raw: line,
          status: "error",
          reason: "Formato incompleto. Usa nombre, apellido1 y apellido2."
        });
      }

      const studentKey = getStudentKey(parsed.firstName, `${parsed.lastName1} ${parsed.lastName2}`);
      const normalizedEmail = parsed.familyEmail.toLowerCase();
      const studentDuplicated = existingStudentKeys.has(studentKey) || seenStudentKeys.has(studentKey);
      const emailDuplicated = existingEmails.has(normalizedEmail) || seenEmails.has(normalizedEmail);
      const status: ImportPreviewStatus = studentDuplicated || emailDuplicated ? "duplicado" : "nuevo";
      const reason = studentDuplicated
        ? "Alumno ya detectado en este curso."
        : emailDuplicated
          ? "Email familiar ya existente."
          : "Listo para importar.";

      seenStudentKeys.add(studentKey);
      seenEmails.add(normalizedEmail);

      return {
        id: String(index),
        raw: line,
        studentName: parsed.studentName,
        firstName: parsed.firstName,
        lastName1: parsed.lastName1,
        lastName2: parsed.lastName2,
        familyEmail: parsed.familyEmail,
        temporaryPassword: importTemporaryPassword,
        status,
        reason
      };
    });

  return {
    rows,
    summary: {
      nuevos: rows.filter((row) => row.status === "nuevo").length,
      duplicados: rows.filter((row) => row.status === "duplicado").length,
      errores: rows.filter((row) => row.status === "error").length
    },
    errorMessage: null
  };
}

function createPreviewRow({
  id,
  raw,
  status,
  reason
}: {
  id: string;
  raw: string;
  status: ImportPreviewStatus;
  reason: string;
}): ImportPreviewRow {
  return {
    id,
    raw,
    studentName: raw,
    firstName: "",
    lastName1: "",
    lastName2: "",
    familyEmail: "",
    temporaryPassword: importTemporaryPassword,
    status,
    reason
  };
}

function getStudentKey(name: string, lastName: string) {
  return `${normalizeForEmail(name)}|${normalizeForEmail(lastName)}`;
}

function normalizeProfileEmail(profile: AdminProfile) {
  return profile.email?.trim().toLowerCase() ?? null;
}
