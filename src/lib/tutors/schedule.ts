import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { requireOperationalSchoolContext } from "@/lib/schools/context";
import { getIsoWeekday, getMadridDate } from "@/lib/date-time/madrid";

export type TeacherScheduleSlot = {
  id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  course_name: string;
  subject_name: string | null;
  is_break: boolean;
  created_at: string;
};

const weekdayLabels = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes"
} as const;

export const teacherScheduleWeekdays = [1, 2, 3, 4, 5] as const;

export function getMadridWeekday() {
  const weekday = getIsoWeekday(getMadridDate());
  return weekday >= 1 && weekday <= 5 ? weekday : null;
}

export function getWeekdayLabel(weekday: number | null) {
  if (!weekday || !(weekday in weekdayLabels)) {
    return "Hoy";
  }

  return weekdayLabels[weekday as keyof typeof weekdayLabels];
}

export async function getTeacherScheduleForToday(teacherId: string): Promise<{
  slots: TeacherScheduleSlot[];
  weekday: number | null;
  errorMessage: string | null;
}> {
  const weekday = getMadridWeekday();

  if (!weekday) {
    return { slots: [], weekday, errorMessage: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_schedule")
    .select("id,teacher_id,weekday,start_time,end_time,course_name,subject_name,is_break,created_at")
    .eq("teacher_id", teacherId)
    .eq("weekday", weekday)
    .order("start_time", { ascending: true })
    .returns<TeacherScheduleSlot[]>();

  if (error) {
    return { slots: [], weekday, errorMessage: error.message };
  }

  return {
    slots: await filterScheduleSlotsForActiveSchool(teacherId, data ?? []),
    weekday,
    errorMessage: null
  };
}

export async function getTeacherScheduleForWeek(teacherId: string): Promise<{
  slots: TeacherScheduleSlot[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_schedule")
    .select("id,teacher_id,weekday,start_time,end_time,course_name,subject_name,is_break,created_at")
    .eq("teacher_id", teacherId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true })
    .returns<TeacherScheduleSlot[]>();

  if (error) {
    return { slots: [], errorMessage: error.message };
  }

  return {
    slots: await filterScheduleSlotsForActiveSchool(teacherId, data ?? []),
    errorMessage: null
  };
}

export function formatScheduleTime(value: string) {
  return value.slice(0, 5);
}

async function filterScheduleSlotsForActiveSchool(
  teacherId: string,
  slots: TeacherScheduleSlot[]
) {
  const schoolContext = await requireOperationalSchoolContext();
  const { academicYear } = await getActiveAcademicYear(schoolContext.schoolId);
  if (!academicYear) return [];

  const supabase = await createClient();
  const { data: teacherSchools, error: teacherSchoolsError } = await supabase
    .from("teacher_assignments")
    .select("school_id")
    .eq("teacher_id", teacherId)
    .returns<{ school_id: string }[]>();

  if (teacherSchoolsError) return [];

  const assignedSchoolIds = new Set(
    (teacherSchools ?? []).map(({ school_id }) => school_id)
  );
  if (
    assignedSchoolIds.size !== 1 ||
    !assignedSchoolIds.has(schoolContext.schoolId)
  ) {
    return [];
  }

  const { data: assignments, error } = await supabase
    .from("teacher_assignments")
    .select("course_id,subject_id")
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYear.id)
    .eq("teacher_id", teacherId)
    .returns<{ course_id: string; subject_id: string | null }[]>();

  if (error || !assignments?.length) return [];

  const courseIds = Array.from(
    new Set(assignments.map(({ course_id }) => course_id))
  );
  const subjectIds = Array.from(
    new Set(
      assignments.flatMap(({ subject_id }) => (subject_id ? [subject_id] : []))
    )
  );
  const [{ data: courses }, { data: subjects }] = await Promise.all([
    supabase
      .from("courses")
      .select("id,name")
      .eq("school_id", schoolContext.schoolId)
      .in("id", courseIds)
      .returns<{ id: string; name: string }[]>(),
    subjectIds.length > 0
      ? supabase
          .from("subjects")
          .select("id,name")
          .eq("school_id", schoolContext.schoolId)
          .in("id", subjectIds)
          .returns<{ id: string; name: string }[]>()
      : Promise.resolve({ data: [] as { id: string; name: string }[] })
  ]);
  const coursesById = new Map(
    (courses ?? []).map(({ id, name }) => [id, normalizeScheduleLabel(name)])
  );
  const subjectsById = new Map(
    (subjects ?? []).map(({ id, name }) => [id, normalizeScheduleLabel(name)])
  );
  const allowed = new Set(
    assignments.flatMap(({ course_id, subject_id }) => {
      const courseName = coursesById.get(course_id);
      if (!courseName) return [];
      const subjectName = subject_id ? subjectsById.get(subject_id) : null;
      return [`${courseName}:${subjectName ?? "*"}`];
    })
  );

  const classSlots = slots.filter((slot) => {
    if (slot.is_break) return false;
    const courseName = normalizeScheduleLabel(slot.course_name);
    const subjectName = slot.subject_name
      ? normalizeScheduleLabel(slot.subject_name)
      : "*";
    return allowed.has(`${courseName}:${subjectName}`) ||
      allowed.has(`${courseName}:*`);
  });
  const allowedWeekdays = new Set(classSlots.map(({ weekday }) => weekday));

  return slots.filter(
    (slot) =>
      classSlots.some(({ id }) => id === slot.id) ||
      (slot.is_break && allowedWeekdays.has(slot.weekday))
  );
}

function normalizeScheduleLabel(value: string) {
  const aliases: Record<string, string> = {
    math: "matematicas",
    science: "ciencias"
  };
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return aliases[normalized] ?? normalized;
}
