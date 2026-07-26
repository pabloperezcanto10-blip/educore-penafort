-- EducaCora public schema bootstrap baseline.
-- Generated from the production structural catalog; contains no table rows.
-- Apply only to a new, empty Supabase project after verifying the target.
-- This file is intentionally outside supabase/migrations.
-- Each named phase is transactional and can be executed independently.

-- baseline:phase:01-types-and-tables:start
begin;

create extension if not exists pgcrypto with schema extensions;

do $baseline$
begin
  create type public."app_role" as enum ('director', 'tutor', 'family', 'superadmin');
exception
  when duplicate_object then null;
end
$baseline$;

create table if not exists public."academic_years" (
  "id" uuid not null,
  "name" text not null,
  "start_date" date,
  "end_date" date,
  "active" boolean not null,
  "created_at" timestamp with time zone not null
);

create table if not exists public."annual_evaluation_weights" (
  "id" uuid not null,
  "teacher_id" uuid not null,
  "course_id" uuid not null,
  "subject_id" uuid not null,
  "term1_weight" numeric(5,2) not null,
  "term2_weight" numeric(5,2) not null,
  "term3_weight" numeric(5,2) not null,
  "active" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."attendance_records" (
  "id" uuid not null,
  "student_id" uuid not null,
  "teacher_id" uuid not null,
  "course_id" uuid not null,
  "subject_id" uuid,
  "schedule_id" uuid,
  "attendance_date" date not null,
  "status" text not null,
  "notes" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists public."audit_logs" (
  "id" uuid not null,
  "actor_user_id" uuid,
  "actor_role" text,
  "action" text not null,
  "module" text not null,
  "entity_type" text not null,
  "entity_id" uuid,
  "before_data" jsonb,
  "after_data" jsonb,
  "created_at" timestamp with time zone not null
);

create table if not exists public."course_subjects" (
  "id" uuid not null,
  "course_id" uuid not null,
  "subject_id" uuid not null,
  "academic_year_id" uuid,
  "optional" boolean not null,
  "track" text,
  "created_at" timestamp with time zone not null
);

create table if not exists public."courses" (
  "id" uuid not null,
  "name" text not null,
  "academic_year_id" uuid not null
);

create table if not exists public."evaluation_criteria" (
  "id" uuid not null,
  "teacher_id" uuid not null,
  "course_id" uuid not null,
  "subject_id" uuid not null,
  "term" text not null,
  "name" text not null,
  "weight" numeric(5,2) not null,
  "criterion_type" text not null,
  "visible_to_family" boolean not null,
  "active" boolean not null,
  "created_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."evaluation_publications" (
  "id" uuid not null,
  "course_id" uuid not null,
  "term" text not null,
  "published" boolean not null,
  "published_at" timestamp with time zone,
  "published_by" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."families" (
  "id" uuid not null,
  "name" text not null,
  "email" text,
  "phone" text,
  "created_at" timestamp with time zone
);

create table if not exists public."final_course_grades" (
  "id" uuid not null,
  "student_id" uuid not null,
  "subject_id" uuid not null,
  "teacher_id" uuid not null,
  "course_id" uuid not null,
  "term1_grade" integer,
  "term2_grade" integer,
  "term3_grade" integer,
  "term1_weight" numeric(5,2) not null,
  "term2_weight" numeric(5,2) not null,
  "term3_weight" numeric(5,2) not null,
  "calculated_grade" numeric(4,2),
  "final_grade" integer,
  "final_observation" text,
  "status" text not null,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."final_evaluation_publications" (
  "id" uuid not null,
  "course_id" uuid not null,
  "published" boolean not null,
  "published_at" timestamp with time zone,
  "published_by" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."internal_notifications" (
  "id" uuid not null,
  "user_id" uuid not null,
  "role" app_role not null,
  "type" text not null,
  "title" text not null,
  "body" text,
  "related_entity_type" text,
  "related_entity_id" uuid,
  "related_href" text,
  "read" boolean not null,
  "created_at" timestamp with time zone not null
);

create table if not exists public."notifications" (
  "id" uuid not null,
  "sender_id" uuid,
  "receiver_id" uuid,
  "student_id" uuid,
  "title" text not null,
  "message" text not null,
  "read" boolean,
  "created_at" timestamp with time zone,
  "category" text not null,
  "read_at" timestamp with time zone,
  "academic_year_id" uuid not null,
  "status" text not null
);

create table if not exists public."parent_students" (
  "id" uuid not null,
  "parent_id" uuid,
  "student_id" uuid
);

create table if not exists public."partial_grades" (
  "id" uuid not null,
  "student_id" uuid not null,
  "teacher_id" uuid not null,
  "subject_id" uuid not null,
  "course_id" uuid not null,
  "term" text not null,
  "assessment_type" text not null,
  "assessment_name" text not null,
  "grade" numeric(4,2) not null,
  "assessment_date" date,
  "comment" text,
  "recommendation" text,
  "visible_to_family" boolean not null,
  "created_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."profiles" (
  "id" uuid not null,
  "email" text,
  "full_name" text,
  "role" app_role not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "active" boolean not null,
  "must_change_password" boolean not null
);

create table if not exists public."quarter_final_grades" (
  "id" uuid not null,
  "student_id" uuid not null,
  "subject_id" uuid not null,
  "teacher_id" uuid not null,
  "course_id" uuid not null,
  "term" text not null,
  "calculated_grade" numeric(4,2) not null,
  "final_grade" numeric(4,2) not null,
  "teacher_observation" text,
  "created_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."student_attendance" (
  "id" uuid not null,
  "student_id" uuid not null,
  "tutor_id" uuid not null,
  "status" text not null,
  "date" date not null,
  "notes" text,
  "justified" boolean not null,
  "justification_text" text,
  "justification_file_url" text,
  "created_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."student_families" (
  "student_id" uuid not null,
  "family_id" uuid not null,
  "relation" text
);

create table if not exists public."student_incidents" (
  "id" uuid not null,
  "student_id" uuid not null,
  "tutor_id" uuid not null,
  "type" text not null,
  "description" text not null,
  "severity" text not null,
  "created_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."student_observations" (
  "id" uuid not null,
  "student_id" uuid not null,
  "tutor_id" uuid not null,
  "type" text not null,
  "title" text not null,
  "content" text not null,
  "priority" text not null,
  "created_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

create table if not exists public."students" (
  "id" uuid not null,
  "name" text not null,
  "last_name" text not null,
  "birth_date" date,
  "course_id" uuid,
  "tutor_teacher_id" uuid,
  "active" boolean,
  "created_at" timestamp with time zone,
  "academic_year_id" uuid not null
);

create table if not exists public."subjects" (
  "id" uuid not null,
  "name" text not null
);

create table if not exists public."teacher_assignments" (
  "id" uuid not null,
  "teacher_id" uuid,
  "subject_id" uuid,
  "course_id" uuid,
  "created_at" timestamp with time zone,
  "academic_year_id" uuid not null
);

create table if not exists public."teacher_schedule" (
  "id" uuid not null,
  "teacher_id" uuid not null,
  "weekday" integer not null,
  "start_time" time without time zone not null,
  "end_time" time without time zone not null,
  "course_name" text not null,
  "subject_name" text,
  "is_break" boolean not null,
  "created_at" timestamp with time zone not null
);

create table if not exists public."teachers" (
  "id" uuid not null,
  "name" text not null,
  "email" text,
  "can_be_tutor" boolean,
  "created_at" timestamp with time zone
);

create table if not exists public."term_subject_grades" (
  "id" uuid not null,
  "student_id" uuid not null,
  "subject_id" uuid not null,
  "teacher_id" uuid not null,
  "course_id" uuid not null,
  "term" text not null,
  "calculated_grade" numeric(4,2),
  "final_grade" integer,
  "final_observation" text,
  "status" text not null,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "academic_year_id" uuid not null
);

commit;
-- baseline:phase:01-types-and-tables:end

-- baseline:phase:02-constraints:start
begin;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'academic_years_pkey'
      and conrelid = 'public.academic_years'::regclass
  ) then
    alter table public."academic_years"
      add constraint "academic_years_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_evaluation_weights_pkey'
      and conrelid = 'public.annual_evaluation_weights'::regclass
  ) then
    alter table public."annual_evaluation_weights"
      add constraint "annual_evaluation_weights_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_pkey'
      and conrelid = 'public.attendance_records'::regclass
  ) then
    alter table public."attendance_records"
      add constraint "attendance_records_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_pkey'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public."audit_logs"
      add constraint "audit_logs_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_subjects_pkey'
      and conrelid = 'public.course_subjects'::regclass
  ) then
    alter table public."course_subjects"
      add constraint "course_subjects_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_pkey'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public."courses"
      add constraint "courses_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_pkey'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_publications_pkey'
      and conrelid = 'public.evaluation_publications'::regclass
  ) then
    alter table public."evaluation_publications"
      add constraint "evaluation_publications_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'families_pkey'
      and conrelid = 'public.families'::regclass
  ) then
    alter table public."families"
      add constraint "families_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_course_grades_pkey'
      and conrelid = 'public.final_course_grades'::regclass
  ) then
    alter table public."final_course_grades"
      add constraint "final_course_grades_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_evaluation_publications_pkey'
      and conrelid = 'public.final_evaluation_publications'::regclass
  ) then
    alter table public."final_evaluation_publications"
      add constraint "final_evaluation_publications_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_notifications_pkey'
      and conrelid = 'public.internal_notifications'::regclass
  ) then
    alter table public."internal_notifications"
      add constraint "internal_notifications_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_pkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public."notifications"
      add constraint "notifications_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'parent_students_pkey'
      and conrelid = 'public.parent_students'::regclass
  ) then
    alter table public."parent_students"
      add constraint "parent_students_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_pkey'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_pkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public."profiles"
      add constraint "profiles_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_pkey'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_attendance_pkey'
      and conrelid = 'public.student_attendance'::regclass
  ) then
    alter table public."student_attendance"
      add constraint "student_attendance_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_families_pkey'
      and conrelid = 'public.student_families'::regclass
  ) then
    alter table public."student_families"
      add constraint "student_families_pkey" PRIMARY KEY (student_id, family_id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_incidents_pkey'
      and conrelid = 'public.student_incidents'::regclass
  ) then
    alter table public."student_incidents"
      add constraint "student_incidents_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_observations_pkey'
      and conrelid = 'public.student_observations'::regclass
  ) then
    alter table public."student_observations"
      add constraint "student_observations_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_pkey'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public."students"
      add constraint "students_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_pkey'
      and conrelid = 'public.subjects'::regclass
  ) then
    alter table public."subjects"
      add constraint "subjects_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_assignments_pkey'
      and conrelid = 'public.teacher_assignments'::regclass
  ) then
    alter table public."teacher_assignments"
      add constraint "teacher_assignments_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_schedule_pkey'
      and conrelid = 'public.teacher_schedule'::regclass
  ) then
    alter table public."teacher_schedule"
      add constraint "teacher_schedule_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teachers_pkey'
      and conrelid = 'public.teachers'::regclass
  ) then
    alter table public."teachers"
      add constraint "teachers_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_pkey'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_pkey" PRIMARY KEY (id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'academic_years_name_key'
      and conrelid = 'public.academic_years'::regclass
  ) then
    alter table public."academic_years"
      add constraint "academic_years_name_key" UNIQUE (name);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_weights_unique_year'
      and conrelid = 'public.annual_evaluation_weights'::regclass
  ) then
    alter table public."annual_evaluation_weights"
      add constraint "annual_weights_unique_year" UNIQUE (academic_year_id, teacher_id, course_id, subject_id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_student_schedule_date_unique'
      and conrelid = 'public.attendance_records'::regclass
  ) then
    alter table public."attendance_records"
      add constraint "attendance_records_student_schedule_date_unique" UNIQUE (student_id, schedule_id, attendance_date);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_name_key'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public."courses"
      add constraint "courses_name_key" UNIQUE (name);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_unique_name_year'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_unique_name_year" UNIQUE (academic_year_id, teacher_id, course_id, subject_id, term, name);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_publications_unique_course_term_year'
      and conrelid = 'public.evaluation_publications'::regclass
  ) then
    alter table public."evaluation_publications"
      add constraint "evaluation_publications_unique_course_term_year" UNIQUE (academic_year_id, course_id, term);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_course_grades_unique_year'
      and conrelid = 'public.final_course_grades'::regclass
  ) then
    alter table public."final_course_grades"
      add constraint "final_course_grades_unique_year" UNIQUE (academic_year_id, student_id, subject_id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_evaluation_publications_unique_course_year'
      and conrelid = 'public.final_evaluation_publications'::regclass
  ) then
    alter table public."final_evaluation_publications"
      add constraint "final_evaluation_publications_unique_course_year" UNIQUE (academic_year_id, course_id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_unique_student_term_year'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_unique_student_term_year" UNIQUE (academic_year_id, student_id, subject_id, teacher_id, course_id, term);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_attendance_student_date_year_unique'
      and conrelid = 'public.student_attendance'::regclass
  ) then
    alter table public."student_attendance"
      add constraint "student_attendance_student_date_year_unique" UNIQUE (academic_year_id, student_id, date);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_name_key'
      and conrelid = 'public.subjects'::regclass
  ) then
    alter table public."subjects"
      add constraint "subjects_name_key" UNIQUE (name);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_schedule_unique_slot'
      and conrelid = 'public.teacher_schedule'::regclass
  ) then
    alter table public."teacher_schedule"
      add constraint "teacher_schedule_unique_slot" UNIQUE (teacher_id, weekday, start_time);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teachers_email_key'
      and conrelid = 'public.teachers'::regclass
  ) then
    alter table public."teachers"
      add constraint "teachers_email_key" UNIQUE (email);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_unique_student_subject_term_year'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_unique_student_subject_term_year" UNIQUE (academic_year_id, student_id, subject_id, term);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'academic_years_date_order'
      and conrelid = 'public.academic_years'::regclass
  ) then
    alter table public."academic_years"
      add constraint "academic_years_date_order" CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'academic_years_name_not_empty'
      and conrelid = 'public.academic_years'::regclass
  ) then
    alter table public."academic_years"
      add constraint "academic_years_name_not_empty" CHECK (length(TRIM(BOTH FROM name)) > 0);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_weights_non_negative'
      and conrelid = 'public.annual_evaluation_weights'::regclass
  ) then
    alter table public."annual_evaluation_weights"
      add constraint "annual_weights_non_negative" CHECK (term1_weight >= 0::numeric AND term2_weight >= 0::numeric AND term3_weight >= 0::numeric);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_weights_sum_100'
      and conrelid = 'public.annual_evaluation_weights'::regclass
  ) then
    alter table public."annual_evaluation_weights"
      add constraint "annual_weights_sum_100" CHECK ((term1_weight + term2_weight + term3_weight) = 100::numeric);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_status_check'
      and conrelid = 'public.attendance_records'::regclass
  ) then
    alter table public."attendance_records"
      add constraint "attendance_records_status_check" CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'justified'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_criterion_type_check'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_criterion_type_check" CHECK (criterion_type = ANY (ARRAY['parcial'::text, 'trimestral'::text, 'comportamiento'::text, 'libreta'::text, 'oral'::text, 'proyecto'::text, 'actitud'::text, 'otro'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_name_not_empty'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_name_not_empty" CHECK (length(TRIM(BOTH FROM name)) > 0);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_term_check'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_term_check" CHECK (term = ANY (ARRAY['1'::text, '2'::text, '3'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_weight_range'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_weight_range" CHECK (weight > 0::numeric AND weight <= 100::numeric);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_publications_published_requires_metadata'
      and conrelid = 'public.evaluation_publications'::regclass
  ) then
    alter table public."evaluation_publications"
      add constraint "evaluation_publications_published_requires_metadata" CHECK (published = false OR published_at IS NOT NULL AND published_by IS NOT NULL);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_publications_term_check'
      and conrelid = 'public.evaluation_publications'::regclass
  ) then
    alter table public."evaluation_publications"
      add constraint "evaluation_publications_term_check" CHECK (term = ANY (ARRAY['1'::text, '2'::text, '3'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_course_grades_status_check'
      and conrelid = 'public.final_course_grades'::regclass
  ) then
    alter table public."final_course_grades"
      add constraint "final_course_grades_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'draft'::text, 'closed'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_notifications_type_check'
      and conrelid = 'public.internal_notifications'::regclass
  ) then
    alter table public."internal_notifications"
      add constraint "internal_notifications_type_check" CHECK (type = ANY (ARRAY['new_communication'::text, 'unread_communication'::text, 'new_visible_grade'::text, 'new_incident'::text, 'pending_attendance_justification'::text, 'report_published'::text, 'evaluation_pending_close'::text, 'report_pending_publication'::text, 'administrative_incident'::text, 'inactive_user'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_category_valid'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public."notifications"
      add constraint "notifications_category_valid" CHECK (category = ANY (ARRAY['incidencia'::text, 'académico'::text, 'tutoría'::text, 'general'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_status_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public."notifications"
      add constraint "notifications_status_check" CHECK (status = ANY (ARRAY['open'::text, 'closed'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_assessment_name_not_empty'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_assessment_name_not_empty" CHECK (length(TRIM(BOTH FROM assessment_name)) > 0);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_assessment_type_check'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_assessment_type_check" CHECK (assessment_type = ANY (ARRAY['parcial'::text, 'trimestral'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_grade_range'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_grade_range" CHECK (grade >= 0::numeric AND grade <= 10::numeric);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_term_check'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_term_check" CHECK (term = ANY (ARRAY['1'::text, '2'::text, '3'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_calculated_range'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_calculated_range" CHECK (calculated_grade >= 0::numeric AND calculated_grade <= 10::numeric);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_final_range'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_final_range" CHECK (final_grade >= 0::numeric AND final_grade <= 10::numeric);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_term_check'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_term_check" CHECK (term = ANY (ARRAY['1'::text, '2'::text, '3'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_attendance_status_check'
      and conrelid = 'public.student_attendance'::regclass
  ) then
    alter table public."student_attendance"
      add constraint "student_attendance_status_check" CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_incidents_description_not_empty'
      and conrelid = 'public.student_incidents'::regclass
  ) then
    alter table public."student_incidents"
      add constraint "student_incidents_description_not_empty" CHECK (length(TRIM(BOTH FROM description)) > 0);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_incidents_severity_valid'
      and conrelid = 'public.student_incidents'::regclass
  ) then
    alter table public."student_incidents"
      add constraint "student_incidents_severity_valid" CHECK (severity = ANY (ARRAY['leve'::text, 'media'::text, 'grave'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_incidents_type_not_empty'
      and conrelid = 'public.student_incidents'::regclass
  ) then
    alter table public."student_incidents"
      add constraint "student_incidents_type_not_empty" CHECK (length(TRIM(BOTH FROM type)) > 0);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_observations_priority_check'
      and conrelid = 'public.student_observations'::regclass
  ) then
    alter table public."student_observations"
      add constraint "student_observations_priority_check" CHECK (priority = ANY (ARRAY['baja'::text, 'media'::text, 'alta'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_schedule_time_order'
      and conrelid = 'public.teacher_schedule'::regclass
  ) then
    alter table public."teacher_schedule"
      add constraint "teacher_schedule_time_order" CHECK (end_time > start_time);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_schedule_weekday_check'
      and conrelid = 'public.teacher_schedule'::regclass
  ) then
    alter table public."teacher_schedule"
      add constraint "teacher_schedule_weekday_check" CHECK (weekday >= 1 AND weekday <= 5);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_calculated_range'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_calculated_range" CHECK (calculated_grade IS NULL OR calculated_grade >= 0::numeric AND calculated_grade <= 10::numeric);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_closed_requires_grades'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_closed_requires_grades" CHECK (status = 'draft'::text OR calculated_grade IS NOT NULL AND final_grade IS NOT NULL AND closed_at IS NOT NULL);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_final_range'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_final_range" CHECK (final_grade IS NULL OR final_grade >= 0 AND final_grade <= 10);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_status_check'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'closed'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_term_check'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_term_check" CHECK (term = ANY (ARRAY['1'::text, '2'::text, '3'::text]));
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_evaluation_weights_academic_year_id_fkey'
      and conrelid = 'public.annual_evaluation_weights'::regclass
  ) then
    alter table public."annual_evaluation_weights"
      add constraint "annual_evaluation_weights_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_evaluation_weights_course_id_fkey'
      and conrelid = 'public.annual_evaluation_weights'::regclass
  ) then
    alter table public."annual_evaluation_weights"
      add constraint "annual_evaluation_weights_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_evaluation_weights_subject_id_fkey'
      and conrelid = 'public.annual_evaluation_weights'::regclass
  ) then
    alter table public."annual_evaluation_weights"
      add constraint "annual_evaluation_weights_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_evaluation_weights_teacher_id_fkey'
      and conrelid = 'public.annual_evaluation_weights'::regclass
  ) then
    alter table public."annual_evaluation_weights"
      add constraint "annual_evaluation_weights_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_course_id_fkey'
      and conrelid = 'public.attendance_records'::regclass
  ) then
    alter table public."attendance_records"
      add constraint "attendance_records_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_schedule_id_fkey'
      and conrelid = 'public.attendance_records'::regclass
  ) then
    alter table public."attendance_records"
      add constraint "attendance_records_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES teacher_schedule(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_student_id_fkey'
      and conrelid = 'public.attendance_records'::regclass
  ) then
    alter table public."attendance_records"
      add constraint "attendance_records_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_subject_id_fkey'
      and conrelid = 'public.attendance_records'::regclass
  ) then
    alter table public."attendance_records"
      add constraint "attendance_records_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_records_teacher_id_fkey'
      and conrelid = 'public.attendance_records'::regclass
  ) then
    alter table public."attendance_records"
      add constraint "attendance_records_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_actor_user_id_fkey'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public."audit_logs"
      add constraint "audit_logs_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_subjects_academic_year_id_fkey'
      and conrelid = 'public.course_subjects'::regclass
  ) then
    alter table public."course_subjects"
      add constraint "course_subjects_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_subjects_course_id_fkey'
      and conrelid = 'public.course_subjects'::regclass
  ) then
    alter table public."course_subjects"
      add constraint "course_subjects_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_subjects_subject_id_fkey'
      and conrelid = 'public.course_subjects'::regclass
  ) then
    alter table public."course_subjects"
      add constraint "course_subjects_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_academic_year_id_fkey'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public."courses"
      add constraint "courses_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_academic_year_id_fkey'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_course_id_fkey'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_subject_id_fkey'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_criteria_teacher_id_fkey'
      and conrelid = 'public.evaluation_criteria'::regclass
  ) then
    alter table public."evaluation_criteria"
      add constraint "evaluation_criteria_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_publications_academic_year_id_fkey'
      and conrelid = 'public.evaluation_publications'::regclass
  ) then
    alter table public."evaluation_publications"
      add constraint "evaluation_publications_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_publications_course_id_fkey'
      and conrelid = 'public.evaluation_publications'::regclass
  ) then
    alter table public."evaluation_publications"
      add constraint "evaluation_publications_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_publications_published_by_fkey'
      and conrelid = 'public.evaluation_publications'::regclass
  ) then
    alter table public."evaluation_publications"
      add constraint "evaluation_publications_published_by_fkey" FOREIGN KEY (published_by) REFERENCES auth.users(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_course_grades_academic_year_id_fkey'
      and conrelid = 'public.final_course_grades'::regclass
  ) then
    alter table public."final_course_grades"
      add constraint "final_course_grades_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_course_grades_course_id_fkey'
      and conrelid = 'public.final_course_grades'::regclass
  ) then
    alter table public."final_course_grades"
      add constraint "final_course_grades_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_course_grades_student_id_fkey'
      and conrelid = 'public.final_course_grades'::regclass
  ) then
    alter table public."final_course_grades"
      add constraint "final_course_grades_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_course_grades_subject_id_fkey'
      and conrelid = 'public.final_course_grades'::regclass
  ) then
    alter table public."final_course_grades"
      add constraint "final_course_grades_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_course_grades_teacher_id_fkey'
      and conrelid = 'public.final_course_grades'::regclass
  ) then
    alter table public."final_course_grades"
      add constraint "final_course_grades_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_evaluation_publications_academic_year_id_fkey'
      and conrelid = 'public.final_evaluation_publications'::regclass
  ) then
    alter table public."final_evaluation_publications"
      add constraint "final_evaluation_publications_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_evaluation_publications_course_id_fkey'
      and conrelid = 'public.final_evaluation_publications'::regclass
  ) then
    alter table public."final_evaluation_publications"
      add constraint "final_evaluation_publications_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'final_evaluation_publications_published_by_fkey'
      and conrelid = 'public.final_evaluation_publications'::regclass
  ) then
    alter table public."final_evaluation_publications"
      add constraint "final_evaluation_publications_published_by_fkey" FOREIGN KEY (published_by) REFERENCES auth.users(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_notifications_user_id_fkey'
      and conrelid = 'public.internal_notifications'::regclass
  ) then
    alter table public."internal_notifications"
      add constraint "internal_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_academic_year_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public."notifications"
      add constraint "notifications_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_receiver_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public."notifications"
      add constraint "notifications_receiver_id_fkey" FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_sender_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public."notifications"
      add constraint "notifications_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_student_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public."notifications"
      add constraint "notifications_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'parent_students_parent_id_fkey'
      and conrelid = 'public.parent_students'::regclass
  ) then
    alter table public."parent_students"
      add constraint "parent_students_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'parent_students_student_id_fkey'
      and conrelid = 'public.parent_students'::regclass
  ) then
    alter table public."parent_students"
      add constraint "parent_students_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_academic_year_id_fkey'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_course_id_fkey'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_student_id_fkey'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_subject_id_fkey'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partial_grades_teacher_id_fkey'
      and conrelid = 'public.partial_grades'::regclass
  ) then
    alter table public."partial_grades"
      add constraint "partial_grades_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public."profiles"
      add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_academic_year_id_fkey'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_course_id_fkey'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_student_id_fkey'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_subject_id_fkey'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quarter_final_grades_teacher_id_fkey'
      and conrelid = 'public.quarter_final_grades'::regclass
  ) then
    alter table public."quarter_final_grades"
      add constraint "quarter_final_grades_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_attendance_academic_year_id_fkey'
      and conrelid = 'public.student_attendance'::regclass
  ) then
    alter table public."student_attendance"
      add constraint "student_attendance_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_attendance_student_id_fkey'
      and conrelid = 'public.student_attendance'::regclass
  ) then
    alter table public."student_attendance"
      add constraint "student_attendance_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_attendance_tutor_id_fkey'
      and conrelid = 'public.student_attendance'::regclass
  ) then
    alter table public."student_attendance"
      add constraint "student_attendance_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_families_family_id_fkey'
      and conrelid = 'public.student_families'::regclass
  ) then
    alter table public."student_families"
      add constraint "student_families_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_families_student_id_fkey'
      and conrelid = 'public.student_families'::regclass
  ) then
    alter table public."student_families"
      add constraint "student_families_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_incidents_academic_year_id_fkey'
      and conrelid = 'public.student_incidents'::regclass
  ) then
    alter table public."student_incidents"
      add constraint "student_incidents_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_incidents_student_id_fkey'
      and conrelid = 'public.student_incidents'::regclass
  ) then
    alter table public."student_incidents"
      add constraint "student_incidents_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_incidents_tutor_id_fkey'
      and conrelid = 'public.student_incidents'::regclass
  ) then
    alter table public."student_incidents"
      add constraint "student_incidents_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_observations_academic_year_id_fkey'
      and conrelid = 'public.student_observations'::regclass
  ) then
    alter table public."student_observations"
      add constraint "student_observations_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_observations_student_id_fkey'
      and conrelid = 'public.student_observations'::regclass
  ) then
    alter table public."student_observations"
      add constraint "student_observations_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_observations_tutor_id_fkey'
      and conrelid = 'public.student_observations'::regclass
  ) then
    alter table public."student_observations"
      add constraint "student_observations_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_academic_year_id_fkey'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public."students"
      add constraint "students_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_course_id_fkey'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public."students"
      add constraint "students_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_assignments_academic_year_id_fkey'
      and conrelid = 'public.teacher_assignments'::regclass
  ) then
    alter table public."teacher_assignments"
      add constraint "teacher_assignments_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_assignments_course_id_fkey'
      and conrelid = 'public.teacher_assignments'::regclass
  ) then
    alter table public."teacher_assignments"
      add constraint "teacher_assignments_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_assignments_subject_id_fkey'
      and conrelid = 'public.teacher_assignments'::regclass
  ) then
    alter table public."teacher_assignments"
      add constraint "teacher_assignments_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_assignments_teacher_id_fkey'
      and conrelid = 'public.teacher_assignments'::regclass
  ) then
    alter table public."teacher_assignments"
      add constraint "teacher_assignments_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_schedule_teacher_id_fkey'
      and conrelid = 'public.teacher_schedule'::regclass
  ) then
    alter table public."teacher_schedule"
      add constraint "teacher_schedule_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_academic_year_id_fkey'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_academic_year_id_fkey" FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_course_id_fkey'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_student_id_fkey'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_subject_id_fkey'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'term_subject_grades_teacher_id_fkey'
      and conrelid = 'public.term_subject_grades'::regclass
  ) then
    alter table public."term_subject_grades"
      add constraint "term_subject_grades_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end
$baseline$;

commit;
-- baseline:phase:02-constraints:end

-- baseline:phase:03-functions-defaults-and-indexes:start
begin;

CREATE OR REPLACE FUNCTION public.active_academic_year_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select id
  from public.academic_years
  where active = true
  order by created_at desc
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = required_role
      and coalesce(p.active, true) = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'family');

  if requested_role not in ('superadmin', 'director', 'tutor', 'family') then
    requested_role := 'family';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    requested_role::public.app_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_attendance_records_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_default_academic_year_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.academic_year_id is null then
    new.academic_year_id = public.active_academic_year_id();
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_evaluation_publications_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_term_subject_grades_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

alter table public."academic_years"
  alter column "id" set default gen_random_uuid();

alter table public."academic_years"
  alter column "active" set default false;

alter table public."academic_years"
  alter column "created_at" set default now();

alter table public."annual_evaluation_weights"
  alter column "id" set default gen_random_uuid();

alter table public."annual_evaluation_weights"
  alter column "term1_weight" set default 33.33;

alter table public."annual_evaluation_weights"
  alter column "term2_weight" set default 33.33;

alter table public."annual_evaluation_weights"
  alter column "term3_weight" set default 33.34;

alter table public."annual_evaluation_weights"
  alter column "active" set default true;

alter table public."annual_evaluation_weights"
  alter column "created_at" set default now();

alter table public."annual_evaluation_weights"
  alter column "updated_at" set default now();

alter table public."attendance_records"
  alter column "id" set default gen_random_uuid();

alter table public."attendance_records"
  alter column "created_at" set default now();

alter table public."attendance_records"
  alter column "updated_at" set default now();

alter table public."audit_logs"
  alter column "id" set default gen_random_uuid();

alter table public."audit_logs"
  alter column "created_at" set default now();

alter table public."course_subjects"
  alter column "id" set default gen_random_uuid();

alter table public."course_subjects"
  alter column "optional" set default false;

alter table public."course_subjects"
  alter column "created_at" set default now();

alter table public."courses"
  alter column "id" set default gen_random_uuid();

alter table public."evaluation_criteria"
  alter column "id" set default gen_random_uuid();

alter table public."evaluation_criteria"
  alter column "visible_to_family" set default true;

alter table public."evaluation_criteria"
  alter column "active" set default true;

alter table public."evaluation_criteria"
  alter column "created_at" set default now();

alter table public."evaluation_publications"
  alter column "id" set default gen_random_uuid();

alter table public."evaluation_publications"
  alter column "published" set default false;

alter table public."evaluation_publications"
  alter column "created_at" set default now();

alter table public."evaluation_publications"
  alter column "updated_at" set default now();

alter table public."families"
  alter column "id" set default gen_random_uuid();

alter table public."families"
  alter column "created_at" set default now();

alter table public."final_course_grades"
  alter column "id" set default gen_random_uuid();

alter table public."final_course_grades"
  alter column "status" set default 'draft'::text;

alter table public."final_course_grades"
  alter column "created_at" set default now();

alter table public."final_course_grades"
  alter column "updated_at" set default now();

alter table public."final_evaluation_publications"
  alter column "id" set default gen_random_uuid();

alter table public."final_evaluation_publications"
  alter column "published" set default false;

alter table public."final_evaluation_publications"
  alter column "created_at" set default now();

alter table public."final_evaluation_publications"
  alter column "updated_at" set default now();

alter table public."internal_notifications"
  alter column "id" set default gen_random_uuid();

alter table public."internal_notifications"
  alter column "read" set default false;

alter table public."internal_notifications"
  alter column "created_at" set default now();

alter table public."notifications"
  alter column "id" set default gen_random_uuid();

alter table public."notifications"
  alter column "read" set default false;

alter table public."notifications"
  alter column "created_at" set default now();

alter table public."notifications"
  alter column "category" set default 'general'::text;

alter table public."notifications"
  alter column "status" set default 'open'::text;

alter table public."parent_students"
  alter column "id" set default gen_random_uuid();

alter table public."partial_grades"
  alter column "id" set default gen_random_uuid();

alter table public."partial_grades"
  alter column "visible_to_family" set default true;

alter table public."partial_grades"
  alter column "created_at" set default now();

alter table public."profiles"
  alter column "role" set default 'family'::app_role;

alter table public."profiles"
  alter column "created_at" set default now();

alter table public."profiles"
  alter column "updated_at" set default now();

alter table public."profiles"
  alter column "active" set default true;

alter table public."profiles"
  alter column "must_change_password" set default false;

alter table public."quarter_final_grades"
  alter column "id" set default gen_random_uuid();

alter table public."quarter_final_grades"
  alter column "created_at" set default now();

alter table public."student_attendance"
  alter column "id" set default gen_random_uuid();

alter table public."student_attendance"
  alter column "justified" set default false;

alter table public."student_attendance"
  alter column "created_at" set default now();

alter table public."student_incidents"
  alter column "id" set default gen_random_uuid();

alter table public."student_incidents"
  alter column "created_at" set default now();

alter table public."student_observations"
  alter column "id" set default gen_random_uuid();

alter table public."student_observations"
  alter column "created_at" set default now();

alter table public."students"
  alter column "id" set default gen_random_uuid();

alter table public."students"
  alter column "active" set default true;

alter table public."students"
  alter column "created_at" set default now();

alter table public."subjects"
  alter column "id" set default gen_random_uuid();

alter table public."teacher_assignments"
  alter column "id" set default gen_random_uuid();

alter table public."teacher_assignments"
  alter column "created_at" set default now();

alter table public."teacher_schedule"
  alter column "id" set default gen_random_uuid();

alter table public."teacher_schedule"
  alter column "is_break" set default false;

alter table public."teacher_schedule"
  alter column "created_at" set default now();

alter table public."teachers"
  alter column "id" set default gen_random_uuid();

alter table public."teachers"
  alter column "can_be_tutor" set default false;

alter table public."teachers"
  alter column "created_at" set default now();

alter table public."term_subject_grades"
  alter column "id" set default gen_random_uuid();

alter table public."term_subject_grades"
  alter column "status" set default 'draft'::text;

alter table public."term_subject_grades"
  alter column "created_at" set default now();

alter table public."term_subject_grades"
  alter column "updated_at" set default now();

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_only_one_active_idx ON public.academic_years USING btree (active) WHERE (active = true);

CREATE INDEX IF NOT EXISTS attendance_records_course_date_idx ON public.attendance_records USING btree (course_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS attendance_records_student_date_idx ON public.attendance_records USING btree (student_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS attendance_records_teacher_date_idx ON public.attendance_records USING btree (teacher_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_module_idx ON public.audit_logs USING btree (action, module, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON public.audit_logs USING btree (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs USING btree (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS course_subjects_subject_idx ON public.course_subjects USING btree (subject_id);

CREATE UNIQUE INDEX IF NOT EXISTS course_subjects_unique_idx ON public.course_subjects USING btree (academic_year_id, course_id, subject_id, COALESCE(track, ''::text));

CREATE INDEX IF NOT EXISTS course_subjects_year_course_idx ON public.course_subjects USING btree (academic_year_id, course_id);

CREATE INDEX IF NOT EXISTS courses_academic_year_idx ON public.courses USING btree (academic_year_id, name);

CREATE INDEX IF NOT EXISTS evaluation_criteria_academic_year_idx ON public.evaluation_criteria USING btree (academic_year_id, teacher_id, course_id, subject_id, term, active);

CREATE INDEX IF NOT EXISTS evaluation_criteria_lookup_idx ON public.evaluation_criteria USING btree (teacher_id, course_id, subject_id, term, active);

CREATE INDEX IF NOT EXISTS evaluation_publications_academic_year_idx ON public.evaluation_publications USING btree (academic_year_id, course_id, term, published);

CREATE INDEX IF NOT EXISTS evaluation_publications_course_term_idx ON public.evaluation_publications USING btree (course_id, term, published);

CREATE INDEX IF NOT EXISTS final_course_grades_academic_year_idx ON public.final_course_grades USING btree (academic_year_id, teacher_id, course_id, subject_id, status);

CREATE INDEX IF NOT EXISTS internal_notifications_role_created_idx ON public.internal_notifications USING btree (role, created_at DESC);

CREATE INDEX IF NOT EXISTS internal_notifications_user_read_created_idx ON public.internal_notifications USING btree (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_academic_year_idx ON public.notifications USING btree (academic_year_id, student_id, created_at);

CREATE INDEX IF NOT EXISTS notifications_receiver_created_at_idx ON public.notifications USING btree (receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_sender_created_at_idx ON public.notifications USING btree (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_status_created_idx ON public.notifications USING btree (status, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_student_id_idx ON public.notifications USING btree (student_id);

CREATE INDEX IF NOT EXISTS partial_grades_academic_year_idx ON public.partial_grades USING btree (academic_year_id, teacher_id, course_id, subject_id, term);

CREATE INDEX IF NOT EXISTS partial_grades_student_term_idx ON public.partial_grades USING btree (student_id, term, created_at DESC);

CREATE INDEX IF NOT EXISTS partial_grades_subject_idx ON public.partial_grades USING btree (subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS partial_grades_teacher_idx ON public.partial_grades USING btree (teacher_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS partial_grades_unique_assessment_year_idx ON public.partial_grades USING btree (academic_year_id, student_id, subject_id, term, assessment_type, assessment_name);

CREATE INDEX IF NOT EXISTS profiles_active_role_idx ON public.profiles USING btree (active, role);

CREATE INDEX IF NOT EXISTS profiles_must_change_password_idx ON public.profiles USING btree (must_change_password);

CREATE INDEX IF NOT EXISTS quarter_final_grades_lookup_idx ON public.quarter_final_grades USING btree (teacher_id, course_id, subject_id, term);

CREATE INDEX IF NOT EXISTS student_attendance_academic_year_idx ON public.student_attendance USING btree (academic_year_id, student_id, date);

CREATE INDEX IF NOT EXISTS student_attendance_status_date_idx ON public.student_attendance USING btree (status, date DESC);

CREATE INDEX IF NOT EXISTS student_attendance_student_date_idx ON public.student_attendance USING btree (student_id, date DESC);

CREATE INDEX IF NOT EXISTS student_attendance_tutor_date_idx ON public.student_attendance USING btree (tutor_id, date DESC);

CREATE INDEX IF NOT EXISTS student_incidents_academic_year_idx ON public.student_incidents USING btree (academic_year_id, student_id, tutor_id, created_at);

CREATE INDEX IF NOT EXISTS student_incidents_student_id_created_at_idx ON public.student_incidents USING btree (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS student_incidents_tutor_id_idx ON public.student_incidents USING btree (tutor_id);

CREATE INDEX IF NOT EXISTS student_observations_academic_year_idx ON public.student_observations USING btree (academic_year_id, student_id, tutor_id, created_at);

CREATE INDEX IF NOT EXISTS student_observations_student_created_at_idx ON public.student_observations USING btree (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS student_observations_tutor_created_at_idx ON public.student_observations USING btree (tutor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_students_course ON public.students USING btree (course_id);

CREATE INDEX IF NOT EXISTS students_academic_year_idx ON public.students USING btree (academic_year_id, course_id, active);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON public.teacher_assignments USING btree (teacher_id);

CREATE INDEX IF NOT EXISTS teacher_assignments_academic_year_idx ON public.teacher_assignments USING btree (academic_year_id, teacher_id, course_id, subject_id);

CREATE INDEX IF NOT EXISTS teacher_assignments_teacher_course_subject_idx ON public.teacher_assignments USING btree (teacher_id, course_id, subject_id);

CREATE INDEX IF NOT EXISTS teacher_schedule_teacher_weekday_idx ON public.teacher_schedule USING btree (teacher_id, weekday, start_time);

CREATE INDEX IF NOT EXISTS term_subject_grades_academic_year_idx ON public.term_subject_grades USING btree (academic_year_id, teacher_id, course_id, subject_id, term, status);

CREATE INDEX IF NOT EXISTS term_subject_grades_teacher_lookup_idx ON public.term_subject_grades USING btree (teacher_id, course_id, subject_id, term, status);

commit;
-- baseline:phase:03-functions-defaults-and-indexes:end

-- baseline:phase:04-triggers-rls-and-policies:start
begin;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'annual_evaluation_weights_default_academic_year'
      and tgrelid = 'public.annual_evaluation_weights'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER annual_evaluation_weights_default_academic_year BEFORE INSERT ON annual_evaluation_weights FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'annual_evaluation_weights_updated_at'
      and tgrelid = 'public.annual_evaluation_weights'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER annual_evaluation_weights_updated_at BEFORE UPDATE ON annual_evaluation_weights FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_attendance_records_updated_at'
      and tgrelid = 'public.attendance_records'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER set_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION set_attendance_records_updated_at();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'courses_default_academic_year'
      and tgrelid = 'public.courses'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER courses_default_academic_year BEFORE INSERT ON courses FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'evaluation_criteria_default_academic_year'
      and tgrelid = 'public.evaluation_criteria'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER evaluation_criteria_default_academic_year BEFORE INSERT ON evaluation_criteria FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'evaluation_publications_default_academic_year'
      and tgrelid = 'public.evaluation_publications'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER evaluation_publications_default_academic_year BEFORE INSERT ON evaluation_publications FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_evaluation_publications_updated_at'
      and tgrelid = 'public.evaluation_publications'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER set_evaluation_publications_updated_at BEFORE UPDATE ON evaluation_publications FOR EACH ROW EXECUTE FUNCTION set_evaluation_publications_updated_at();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'final_course_grades_default_academic_year'
      and tgrelid = 'public.final_course_grades'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER final_course_grades_default_academic_year BEFORE INSERT ON final_course_grades FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'final_course_grades_updated_at'
      and tgrelid = 'public.final_course_grades'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER final_course_grades_updated_at BEFORE UPDATE ON final_course_grades FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'final_evaluation_publications_default_academic_year'
      and tgrelid = 'public.final_evaluation_publications'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER final_evaluation_publications_default_academic_year BEFORE INSERT ON final_evaluation_publications FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'final_evaluation_publications_updated_at'
      and tgrelid = 'public.final_evaluation_publications'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER final_evaluation_publications_updated_at BEFORE UPDATE ON final_evaluation_publications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'notifications_default_academic_year'
      and tgrelid = 'public.notifications'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER notifications_default_academic_year BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'partial_grades_default_academic_year'
      and tgrelid = 'public.partial_grades'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER partial_grades_default_academic_year BEFORE INSERT ON partial_grades FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'profiles_set_updated_at'
      and tgrelid = 'public.profiles'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'quarter_final_grades_default_academic_year'
      and tgrelid = 'public.quarter_final_grades'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER quarter_final_grades_default_academic_year BEFORE INSERT ON quarter_final_grades FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'student_attendance_default_academic_year'
      and tgrelid = 'public.student_attendance'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER student_attendance_default_academic_year BEFORE INSERT ON student_attendance FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'student_incidents_default_academic_year'
      and tgrelid = 'public.student_incidents'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER student_incidents_default_academic_year BEFORE INSERT ON student_incidents FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'student_observations_default_academic_year'
      and tgrelid = 'public.student_observations'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER student_observations_default_academic_year BEFORE INSERT ON student_observations FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'students_default_academic_year'
      and tgrelid = 'public.students'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER students_default_academic_year BEFORE INSERT ON students FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'teacher_assignments_default_academic_year'
      and tgrelid = 'public.teacher_assignments'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER teacher_assignments_default_academic_year BEFORE INSERT ON teacher_assignments FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_term_subject_grades_updated_at'
      and tgrelid = 'public.term_subject_grades'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER set_term_subject_grades_updated_at BEFORE UPDATE ON term_subject_grades FOR EACH ROW EXECUTE FUNCTION set_term_subject_grades_updated_at();
  end if;
end
$baseline$;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'term_subject_grades_default_academic_year'
      and tgrelid = 'public.term_subject_grades'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER term_subject_grades_default_academic_year BEFORE INSERT ON term_subject_grades FOR EACH ROW EXECUTE FUNCTION set_default_academic_year_id();
  end if;
end
$baseline$;

alter table public."academic_years" enable row level security;
alter table public."annual_evaluation_weights" enable row level security;
alter table public."attendance_records" enable row level security;
alter table public."audit_logs" enable row level security;
alter table public."course_subjects" enable row level security;
alter table public."courses" enable row level security;
alter table public."evaluation_criteria" enable row level security;
alter table public."evaluation_publications" enable row level security;
alter table public."families" enable row level security;
alter table public."final_course_grades" enable row level security;
alter table public."final_evaluation_publications" enable row level security;
alter table public."internal_notifications" enable row level security;
alter table public."notifications" enable row level security;
alter table public."parent_students" enable row level security;
alter table public."partial_grades" enable row level security;
alter table public."profiles" enable row level security;
alter table public."quarter_final_grades" enable row level security;
alter table public."student_attendance" enable row level security;
alter table public."student_families" enable row level security;
alter table public."student_incidents" enable row level security;
alter table public."student_observations" enable row level security;
alter table public."students" enable row level security;
alter table public."subjects" enable row level security;
alter table public."teacher_assignments" enable row level security;
alter table public."teacher_schedule" enable row level security;
alter table public."teachers" enable row level security;
alter table public."term_subject_grades" enable row level security;

create policy "academic_years_active_select"
on public."academic_years"
as permissive
for select
to "authenticated"
using (((active = true) AND (current_user_has_role('tutor'::text) OR current_user_has_role('family'::text))));

create policy "academic_years_director_select"
on public."academic_years"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "academic_years_superadmin_all"
on public."academic_years"
as permissive
for all
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "annual_weights_supervision_select"
on public."annual_evaluation_weights"
as permissive
for select
to "authenticated"
using ((current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text)));

create policy "annual_weights_teacher_all_assigned"
on public."annual_evaluation_weights"
as permissive
for all
to "authenticated"
using (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = annual_evaluation_weights.course_id) AND (ta.subject_id = annual_evaluation_weights.subject_id))))))
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = annual_evaluation_weights.course_id) AND (ta.subject_id = annual_evaluation_weights.subject_id))))));

create policy "attendance_records_director_select_all"
on public."attendance_records"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "attendance_records_family_select_children"
on public."attendance_records"
as permissive
for select
to "authenticated"
using ((EXISTS ( SELECT 1
   FROM parent_students ps
  WHERE ((ps.student_id = attendance_records.student_id) AND (ps.parent_id = auth.uid())))));

create policy "attendance_records_superadmin_select_all"
on public."attendance_records"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "attendance_records_teacher_insert_own_sessions"
on public."attendance_records"
as permissive
for insert
to "authenticated"
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_schedule ts
  WHERE ((ts.id = attendance_records.schedule_id) AND (ts.teacher_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = attendance_records.student_id) AND (s.course_id = attendance_records.course_id) AND (s.active = true))))));

create policy "attendance_records_teacher_select_own_sessions"
on public."attendance_records"
as permissive
for select
to "authenticated"
using (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_schedule ts
  WHERE ((ts.id = attendance_records.schedule_id) AND (ts.teacher_id = auth.uid()))))));

create policy "attendance_records_teacher_update_own_sessions"
on public."attendance_records"
as permissive
for update
to "authenticated"
using (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_schedule ts
  WHERE ((ts.id = attendance_records.schedule_id) AND (ts.teacher_id = auth.uid()))))))
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_schedule ts
  WHERE ((ts.id = attendance_records.schedule_id) AND (ts.teacher_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = attendance_records.student_id) AND (s.course_id = attendance_records.course_id) AND (s.active = true))))));

create policy "audit_logs_director_select_non_technical"
on public."audit_logs"
as permissive
for select
to "authenticated"
using ((current_user_has_role('director'::text) AND (action = ANY (ARRAY['grade_updated'::text, 'term_grade_closed'::text, 'term_grade_reopened'::text, 'evaluation_published'::text, 'communication_sent'::text]))));

create policy "audit_logs_superadmin_select_all"
on public."audit_logs"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "course_subjects_authenticated_select"
on public."course_subjects"
as permissive
for select
to "authenticated"
using (true);

create policy "course_subjects_superadmin_delete"
on public."course_subjects"
as permissive
for delete
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "course_subjects_superadmin_insert"
on public."course_subjects"
as permissive
for insert
to "authenticated"
with check (current_user_has_role('superadmin'::text));

create policy "course_subjects_superadmin_update"
on public."course_subjects"
as permissive
for update
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "courses_authenticated_select_all"
on public."courses"
as permissive
for select
to "authenticated"
using (true);

create policy "courses_director_select_all"
on public."courses"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "courses_superadmin_insert_all"
on public."courses"
as permissive
for insert
to "authenticated"
with check (current_user_has_role('superadmin'::text));

create policy "courses_superadmin_update_all"
on public."courses"
as permissive
for update
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "evaluation_criteria_director_select_all"
on public."evaluation_criteria"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "evaluation_criteria_superadmin_select_all"
on public."evaluation_criteria"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "evaluation_criteria_teacher_delete_own"
on public."evaluation_criteria"
as permissive
for delete
to "authenticated"
using ((teacher_id = auth.uid()));

create policy "evaluation_criteria_teacher_insert_own"
on public."evaluation_criteria"
as permissive
for insert
to "authenticated"
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = evaluation_criteria.course_id) AND (ta.subject_id = evaluation_criteria.subject_id))))));

create policy "evaluation_criteria_teacher_select_own"
on public."evaluation_criteria"
as permissive
for select
to "authenticated"
using ((teacher_id = auth.uid()));

create policy "evaluation_criteria_teacher_update_own"
on public."evaluation_criteria"
as permissive
for update
to "authenticated"
using ((teacher_id = auth.uid()))
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = evaluation_criteria.course_id) AND (ta.subject_id = evaluation_criteria.subject_id))))));

create policy "evaluation_publications_director_insert"
on public."evaluation_publications"
as permissive
for insert
to "authenticated"
with check (current_user_has_role('director'::text));

create policy "evaluation_publications_director_select"
on public."evaluation_publications"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "evaluation_publications_director_update"
on public."evaluation_publications"
as permissive
for update
to "authenticated"
using (current_user_has_role('director'::text))
with check (current_user_has_role('director'::text));

create policy "evaluation_publications_family_select_published"
on public."evaluation_publications"
as permissive
for select
to "authenticated"
using (((published = true) AND current_user_has_role('family'::text) AND (EXISTS ( SELECT 1
   FROM (parent_students ps
     JOIN students s ON ((s.id = ps.student_id)))
  WHERE ((ps.parent_id = auth.uid()) AND (s.course_id = evaluation_publications.course_id))))));

create policy "evaluation_publications_superadmin_insert"
on public."evaluation_publications"
as permissive
for insert
to "authenticated"
with check (current_user_has_role('superadmin'::text));

create policy "evaluation_publications_superadmin_select"
on public."evaluation_publications"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "evaluation_publications_superadmin_update"
on public."evaluation_publications"
as permissive
for update
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "evaluation_publications_tutor_select"
on public."evaluation_publications"
as permissive
for select
to "authenticated"
using ((current_user_has_role('tutor'::text) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = evaluation_publications.course_id))))));

create policy "final_course_grades_family_published_select"
on public."final_course_grades"
as permissive
for select
to "authenticated"
using ((EXISTS ( SELECT 1
   FROM (parent_students ps
     JOIN final_evaluation_publications fep ON ((fep.course_id = final_course_grades.course_id)))
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = final_course_grades.student_id) AND (fep.published = true)))));

create policy "final_course_grades_supervision_select"
on public."final_course_grades"
as permissive
for select
to "authenticated"
using ((current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text)));

create policy "final_course_grades_teacher_all_assigned"
on public."final_course_grades"
as permissive
for all
to "authenticated"
using (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = final_course_grades.course_id) AND (ta.subject_id = final_course_grades.subject_id))))))
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = final_course_grades.course_id) AND (ta.subject_id = final_course_grades.subject_id))))));

create policy "final_publications_read_scoped"
on public."final_evaluation_publications"
as permissive
for select
to "authenticated"
using ((current_user_has_role('tutor'::text) OR current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text) OR ((published = true) AND (EXISTS ( SELECT 1
   FROM (parent_students ps
     JOIN students s ON ((s.id = ps.student_id)))
  WHERE ((ps.parent_id = auth.uid()) AND (s.course_id = final_evaluation_publications.course_id)))))));

create policy "final_publications_supervision_all"
on public."final_evaluation_publications"
as permissive
for all
to "authenticated"
using ((current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text)))
with check ((current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text)));

create policy "internal_notifications_insert_staff"
on public."internal_notifications"
as permissive
for insert
to "authenticated"
with check ((current_user_has_role('tutor'::text) OR current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text)));

create policy "internal_notifications_select_own"
on public."internal_notifications"
as permissive
for select
to "authenticated"
using (((user_id = auth.uid()) OR current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text)));

create policy "internal_notifications_superadmin_delete"
on public."internal_notifications"
as permissive
for delete
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "internal_notifications_update_own_read"
on public."internal_notifications"
as permissive
for update
to "authenticated"
using (((user_id = auth.uid()) OR current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text)))
with check (((user_id = auth.uid()) OR current_user_has_role('director'::text) OR current_user_has_role('superadmin'::text)));

create policy "notifications_director_insert"
on public."notifications"
as permissive
for insert
to "authenticated"
with check (((sender_id = auth.uid()) AND (read = false) AND (read_at IS NULL) AND current_user_has_role('director'::text)));

create policy "notifications_family_mark_own_read"
on public."notifications"
as permissive
for update
to "authenticated"
using ((receiver_id = auth.uid()))
with check (((receiver_id = auth.uid()) AND (read = true) AND (read_at IS NOT NULL)));

create policy "notifications_select_scoped"
on public."notifications"
as permissive
for select
to "authenticated"
using (((sender_id = auth.uid()) OR (receiver_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::app_role))))));

create policy "notifications_tutor_insert_family_student"
on public."notifications"
as permissive
for insert
to "authenticated"
with check (((sender_id = auth.uid()) AND (read = false) AND (read_at IS NULL) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'tutor'::app_role)))) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = notifications.student_id) AND (s.tutor_teacher_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM parent_students ps
  WHERE ((ps.student_id = notifications.student_id) AND (ps.parent_id = notifications.receiver_id))))));

create policy "parent_students_family_select_own"
on public."parent_students"
as permissive
for select
to "authenticated"
using ((parent_id = auth.uid()));

create policy "parent_students_superadmin_delete_all"
on public."parent_students"
as permissive
for delete
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "parent_students_superadmin_insert_all"
on public."parent_students"
as permissive
for insert
to "authenticated"
with check (current_user_has_role('superadmin'::text));

create policy "parent_students_superadmin_select_all"
on public."parent_students"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "partial_grades_director_select_all"
on public."partial_grades"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "partial_grades_family_select_children_visible"
on public."partial_grades"
as permissive
for select
to "authenticated"
using (((visible_to_family = true) AND (EXISTS ( SELECT 1
   FROM parent_students ps
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = partial_grades.student_id))))));

create policy "partial_grades_superadmin_select_all"
on public."partial_grades"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "partial_grades_teacher_insert_assigned"
on public."partial_grades"
as permissive
for insert
to "authenticated"
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (students s
     JOIN teacher_assignments ta ON (((ta.teacher_id = auth.uid()) AND (ta.course_id = s.course_id) AND (ta.subject_id = partial_grades.subject_id))))
  WHERE ((s.id = partial_grades.student_id) AND (s.course_id = partial_grades.course_id))))));

create policy "partial_grades_teacher_select_assigned"
on public."partial_grades"
as permissive
for select
to "authenticated"
using (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (students s
     JOIN teacher_assignments ta ON (((ta.teacher_id = auth.uid()) AND (ta.course_id = s.course_id) AND (ta.subject_id = partial_grades.subject_id))))
  WHERE ((s.id = partial_grades.student_id) AND (s.course_id = partial_grades.course_id))))));

create policy "partial_grades_teacher_update_assigned"
on public."partial_grades"
as permissive
for update
to "authenticated"
using (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (students s
     JOIN teacher_assignments ta ON (((ta.teacher_id = auth.uid()) AND (ta.course_id = s.course_id) AND (ta.subject_id = partial_grades.subject_id))))
  WHERE ((s.id = partial_grades.student_id) AND (s.course_id = partial_grades.course_id))))))
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (students s
     JOIN teacher_assignments ta ON (((ta.teacher_id = auth.uid()) AND (ta.course_id = s.course_id) AND (ta.subject_id = partial_grades.subject_id))))
  WHERE ((s.id = partial_grades.student_id) AND (s.course_id = partial_grades.course_id))))));

create policy "profiles_select_own"
on public."profiles"
as permissive
for select
to "authenticated"
using ((auth.uid() = id));

create policy "profiles_superadmin_select_all"
on public."profiles"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "profiles_superadmin_update_all"
on public."profiles"
as permissive
for update
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "profiles_update_own_name"
on public."profiles"
as permissive
for update
to "authenticated"
using ((auth.uid() = id))
with check ((auth.uid() = id));

create policy "profiles_user_select_own_password_flag"
on public."profiles"
as permissive
for select
to "authenticated"
using ((id = auth.uid()));

create policy "quarter_final_grades_director_select_all"
on public."quarter_final_grades"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "quarter_final_grades_superadmin_select_all"
on public."quarter_final_grades"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "quarter_final_grades_teacher_insert_own"
on public."quarter_final_grades"
as permissive
for insert
to "authenticated"
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = quarter_final_grades.course_id) AND (ta.subject_id = quarter_final_grades.subject_id))))));

create policy "quarter_final_grades_teacher_select_own"
on public."quarter_final_grades"
as permissive
for select
to "authenticated"
using ((teacher_id = auth.uid()));

create policy "quarter_final_grades_teacher_update_own"
on public."quarter_final_grades"
as permissive
for update
to "authenticated"
using ((teacher_id = auth.uid()))
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = quarter_final_grades.course_id) AND (ta.subject_id = quarter_final_grades.subject_id))))));

create policy "student_attendance_director_select_all"
on public."student_attendance"
as permissive
for select
to "authenticated"
using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::app_role)))));

create policy "student_attendance_family_select_children"
on public."student_attendance"
as permissive
for select
to "authenticated"
using ((EXISTS ( SELECT 1
   FROM parent_students ps
  WHERE ((ps.student_id = student_attendance.student_id) AND (ps.parent_id = auth.uid())))));

create policy "student_attendance_tutor_insert_own_students"
on public."student_attendance"
as permissive
for insert
to "authenticated"
with check (((tutor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_attendance.student_id) AND (s.tutor_teacher_id = auth.uid()))))));

create policy "student_attendance_tutor_select_own_students"
on public."student_attendance"
as permissive
for select
to "authenticated"
using (((tutor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_attendance.student_id) AND (s.tutor_teacher_id = auth.uid()))))));

create policy "student_attendance_tutor_update_own_students"
on public."student_attendance"
as permissive
for update
to "authenticated"
using (((tutor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_attendance.student_id) AND (s.tutor_teacher_id = auth.uid()))))))
with check (((tutor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_attendance.student_id) AND (s.tutor_teacher_id = auth.uid()))))));

create policy "student_incidents_tutor_insert_own_students"
on public."student_incidents"
as permissive
for insert
to "authenticated"
with check (((tutor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_incidents.student_id) AND (s.tutor_teacher_id = auth.uid()))))));

create policy "student_incidents_tutor_select_own_students"
on public."student_incidents"
as permissive
for select
to "authenticated"
using (((tutor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_incidents.student_id) AND (s.tutor_teacher_id = auth.uid()))))));

create policy "student_observations_director_select_all"
on public."student_observations"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "student_observations_superadmin_select_all"
on public."student_observations"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "student_observations_tutor_insert_own_students"
on public."student_observations"
as permissive
for insert
to "authenticated"
with check (((tutor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_observations.student_id) AND (s.tutor_teacher_id = auth.uid()))))));

create policy "student_observations_tutor_select_own_students"
on public."student_observations"
as permissive
for select
to "authenticated"
using (((tutor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_observations.student_id) AND (s.tutor_teacher_id = auth.uid()))))));

create policy "students_director_can_read_all_students"
on public."students"
as permissive
for select
to "authenticated"
using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::app_role)))));

create policy "students_superadmin_insert_all"
on public."students"
as permissive
for insert
to "authenticated"
with check (current_user_has_role('superadmin'::text));

create policy "students_superadmin_select_all"
on public."students"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "students_superadmin_update_all"
on public."students"
as permissive
for update
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "students_tutor_can_read_assigned_students"
on public."students"
as permissive
for select
to "authenticated"
using ((tutor_teacher_id = auth.uid()));

create policy "subjects_authenticated_select_all"
on public."subjects"
as permissive
for select
to "authenticated"
using (true);

create policy "subjects_superadmin_insert_all"
on public."subjects"
as permissive
for insert
to "authenticated"
with check (current_user_has_role('superadmin'::text));

create policy "subjects_superadmin_update_all"
on public."subjects"
as permissive
for update
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "teacher_assignments_superadmin_insert_all"
on public."teacher_assignments"
as permissive
for insert
to "authenticated"
with check (current_user_has_role('superadmin'::text));

create policy "teacher_assignments_superadmin_select_all"
on public."teacher_assignments"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "teacher_assignments_superadmin_update_all"
on public."teacher_assignments"
as permissive
for update
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "teacher_assignments_teacher_select_own"
on public."teacher_assignments"
as permissive
for select
to "authenticated"
using ((teacher_id = auth.uid()));

create policy "teacher_schedule_director_select_all"
on public."teacher_schedule"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "teacher_schedule_superadmin_all"
on public."teacher_schedule"
as permissive
for all
to "authenticated"
using (current_user_has_role('superadmin'::text))
with check (current_user_has_role('superadmin'::text));

create policy "teacher_schedule_teacher_select_own"
on public."teacher_schedule"
as permissive
for select
to "authenticated"
using ((teacher_id = auth.uid()));

create policy "term_subject_grades_director_select_all"
on public."term_subject_grades"
as permissive
for select
to "authenticated"
using (current_user_has_role('director'::text));

create policy "term_subject_grades_family_select_published"
on public."term_subject_grades"
as permissive
for select
to "authenticated"
using (((status = 'closed'::text) AND (EXISTS ( SELECT 1
   FROM parent_students ps
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = term_subject_grades.student_id)))) AND (EXISTS ( SELECT 1
   FROM evaluation_publications ep
  WHERE ((ep.course_id = term_subject_grades.course_id) AND (ep.term = term_subject_grades.term) AND (ep.published = true))))));

create policy "term_subject_grades_superadmin_select_all"
on public."term_subject_grades"
as permissive
for select
to "authenticated"
using (current_user_has_role('superadmin'::text));

create policy "term_subject_grades_teacher_insert_assigned"
on public."term_subject_grades"
as permissive
for insert
to "authenticated"
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = term_subject_grades.course_id) AND (ta.subject_id = term_subject_grades.subject_id))))));

create policy "term_subject_grades_teacher_select_assigned"
on public."term_subject_grades"
as permissive
for select
to "authenticated"
using (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = term_subject_grades.course_id) AND (ta.subject_id = term_subject_grades.subject_id))))));

create policy "term_subject_grades_teacher_update_assigned"
on public."term_subject_grades"
as permissive
for update
to "authenticated"
using (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = term_subject_grades.course_id) AND (ta.subject_id = term_subject_grades.subject_id))))))
with check (((teacher_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM teacher_assignments ta
  WHERE ((ta.teacher_id = auth.uid()) AND (ta.course_id = term_subject_grades.course_id) AND (ta.subject_id = term_subject_grades.subject_id))))));

commit;
-- baseline:phase:04-triggers-rls-and-policies:end

-- baseline:phase:05-grants:start
begin;

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."academic_years" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."academic_years" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."academic_years" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."annual_evaluation_weights" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."annual_evaluation_weights" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."annual_evaluation_weights" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."attendance_records" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."attendance_records" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."attendance_records" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."audit_logs" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."audit_logs" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."audit_logs" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."course_subjects" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."course_subjects" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."course_subjects" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."courses" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."courses" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."courses" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."evaluation_criteria" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."evaluation_criteria" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."evaluation_criteria" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."evaluation_publications" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."evaluation_publications" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."evaluation_publications" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."families" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."families" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."families" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."final_course_grades" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."final_course_grades" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."final_course_grades" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."final_evaluation_publications" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."final_evaluation_publications" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."final_evaluation_publications" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."internal_notifications" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."internal_notifications" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."internal_notifications" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."notifications" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."notifications" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."notifications" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."parent_students" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."parent_students" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."parent_students" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."partial_grades" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."partial_grades" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."partial_grades" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."profiles" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."profiles" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."profiles" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."quarter_final_grades" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."quarter_final_grades" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."quarter_final_grades" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_attendance" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_attendance" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_attendance" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_families" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_families" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_families" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_incidents" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_incidents" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_incidents" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_observations" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_observations" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."student_observations" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."students" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."students" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."students" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."subjects" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."subjects" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."subjects" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teacher_assignments" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teacher_assignments" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teacher_assignments" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teacher_schedule" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teacher_schedule" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teacher_schedule" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teachers" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teachers" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."teachers" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."term_subject_grades" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."term_subject_grades" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public."term_subject_grades" to "service_role";

grant execute on all functions in schema public to "anon";
grant execute on all functions in schema public to "authenticated";
grant execute on all functions in schema public to "service_role";
commit;
-- baseline:phase:05-grants:end

-- baseline:phase:06-auth-hooks:start
begin;

do $baseline$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
      and not tgisinternal
  ) then
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  end if;
end
$baseline$;

commit;
-- baseline:phase:06-auth-hooks:end
