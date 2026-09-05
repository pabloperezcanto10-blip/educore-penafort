import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "zhnbrpcekmxldxlqrbhr";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const SCHOOL_SLUG = "educacora";
const PENAFORT_SLUG = "colegio-penafort";
const QA_SCHOOL_SLUG = "qa-school";
const DATASET_TAG = "20_2N1";
const SUPERADMIN_EMAIL = "admin@penafortplatform.com";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const credentialsPath = resolve(
  repositoryRoot,
  ".local",
  "educacora-test-credentials.txt"
);

const userDefinitions = {
  director: {
    email: "director@educacora.example.test",
    fullName: "Dirección EducaCora",
    role: "director"
  },
  tutor: {
    email: "tutor@educacora.example.test",
    fullName: "Tutor EducaCora",
    role: "tutor"
  },
  family: {
    email: "familia@educacora.example.test",
    fullName: "Familia EducaCora",
    role: "family"
  }
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requiredEnvironment(name) {
  const value = process.env[name];
  assert(value, `${name} is required.`);
  return value;
}

function randomPassword() {
  return `Ec!${randomBytes(24).toString("base64url")}9a`;
}

function loadOrCreateCredentials() {
  if (existsSync(credentialsPath)) {
    const raw = readFileSync(credentialsPath, "utf8");
    const parsed = raw.trimStart().startsWith("{")
      ? JSON.parse(raw)
      : {
          projectRef: STAGING_REF,
          schoolSlug: SCHOOL_SLUG,
          users: {
            director: parseTextCredential(raw, "DIRECTOR EDUCACORA"),
            tutor: parseTextCredential(raw, "TUTOR EDUCACORA"),
            family: parseTextCredential(raw, "FAMILIA EDUCACORA")
          }
        };
    assert(parsed.projectRef === STAGING_REF, "The local credentials target another project.");
    assert(parsed.schoolSlug === SCHOOL_SLUG, "The local credentials target another school.");
    for (const [key, definition] of Object.entries(userDefinitions)) {
      assert(parsed.users?.[key]?.email === definition.email, `Unexpected ${key} email in local credentials.`);
      assert(parsed.users?.[key]?.password, `Missing ${key} password in local credentials.`);
    }
    return { credentials: parsed, existed: true };
  }

  const credentials = {
    projectRef: STAGING_REF,
    schoolSlug: SCHOOL_SLUG,
    createdAt: new Date().toISOString(),
    users: Object.fromEntries(
      Object.entries(userDefinitions).map(([key, definition]) => [
        key,
        { email: definition.email, password: randomPassword() }
      ])
    )
  };

  mkdirSync(dirname(credentialsPath), { recursive: true });
  writeFileSync(credentialsPath, `${JSON.stringify(credentials, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx"
  });
  return { credentials, existed: false };
}

function parseTextCredential(raw, heading) {
  const start = raw.indexOf(heading);
  assert(start >= 0, `Missing ${heading} credentials.`);
  const next = raw.indexOf("\n\n", start);
  const section = raw.slice(start, next === -1 ? raw.length : next);
  const email = section.match(/^Email: (.+)$/m)?.[1]?.trim();
  const password = section.match(/^Contraseña: (.+)$/m)?.[1]?.trim();
  assert(email && password, `Incomplete ${heading} credentials.`);
  return { email, password };
}

async function dataOrThrow(promise, label) {
  const { data, error } = await promise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

async function listAllUsers(supabase) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      throw new Error(`List Auth users: ${error.message}`);
    }
    users.push(...data.users);
    if (data.users.length < 100) {
      return users;
    }
  }
}

async function ensureSchool(supabase) {
  const existing = await dataOrThrow(
    supabase.from("schools").select("*").eq("slug", SCHOOL_SLUG).maybeSingle(),
    "Read EducaCora school"
  );
  if (existing && existing.name !== "Colegio EducaCora") {
    throw new Error("The educacora slug is already used by a contradictory school record.");
  }

  const payload = {
    name: "Colegio EducaCora",
    short_name: "EducaCora",
    slug: SCHOOL_SLUG,
    status: "active",
    active: true,
    logo_url: "/brand/educore/logo.svg",
    primary_color: "#2E7D5A",
    secondary_color: "#0F172A",
    accent_color: "#D4A64F",
    family_email_domain: "educacora.example.test",
    calendar_id: null
  };

  if (existing) {
    return dataOrThrow(
      supabase.from("schools").update(payload).eq("id", existing.id).select("*").single(),
      "Update EducaCora school"
    );
  }

  return dataOrThrow(
    supabase.from("schools").insert({ id: randomUUID(), ...payload }).select("*").single(),
    "Create EducaCora school"
  );
}

async function ensureUser(supabase, usersByEmail, key, credentials, credentialsExisted) {
  const definition = userDefinitions[key];
  let user = usersByEmail.get(definition.email);

  if (!user) {
    const result = await supabase.auth.admin.createUser({
      email: definition.email,
      password: credentials.users[key].password,
      email_confirm: true,
      user_metadata: { full_name: definition.fullName }
    });
    if (result.error) {
      throw new Error(`Create ${key} Auth user: ${result.error.message}`);
    }
    user = result.data.user;
    usersByEmail.set(definition.email, user);
  } else if (!credentialsExisted) {
    throw new Error(
      `The ${key} Auth user already exists but no matching ignored credential file was available. Refusing to reset a password.`
    );
  }

  await dataOrThrow(
    supabase
      .from("profiles")
      .update({
        email: definition.email,
        full_name: definition.fullName,
        role: definition.role,
        active: true,
        must_change_password: false
      })
      .eq("id", user.id)
      .select("id")
      .single(),
    `Update ${key} profile`
  );

  return user;
}

async function ensureMembership(supabase, { schoolId, userId, role }) {
  const existing = await dataOrThrow(
    supabase
      .from("school_memberships")
      .select("id")
      .eq("school_id", schoolId)
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle(),
    `Read ${role} membership`
  );

  if (existing) {
    await dataOrThrow(
      supabase
        .from("school_memberships")
        .update({ active: true })
        .eq("id", existing.id)
        .select("id")
        .single(),
      `Reactivate ${role} membership`
    );
    return existing.id;
  }

  const membership = await dataOrThrow(
    supabase
      .from("school_memberships")
      .insert({ id: randomUUID(), school_id: schoolId, user_id: userId, role, active: true })
      .select("id")
      .single(),
    `Create ${role} membership`
  );
  return membership.id;
}

async function ensureNamedRow(supabase, table, filters, payload) {
  let query = supabase.from(table).select("*");
  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const existing = await dataOrThrow(query.maybeSingle(), `Read ${table}`);
  if (existing) {
    return dataOrThrow(
      supabase.from(table).update(payload).eq("id", existing.id).select("*").single(),
      `Update ${table}`
    );
  }
  return dataOrThrow(
    supabase.from(table).insert({ id: randomUUID(), ...payload }).select("*").single(),
    `Create ${table}`
  );
}

async function ensureAcademicStructure(supabase, schoolId) {
  const activeYears = await dataOrThrow(
    supabase.from("academic_years").select("*").eq("school_id", schoolId).eq("active", true),
    "Read active EducaCora academic year"
  );
  if (activeYears.length > 1) {
    throw new Error("EducaCora has more than one active academic year.");
  }

  const yearName = "2026-2027";
  let academicYear = activeYears[0];
  if (academicYear && academicYear.name !== yearName) {
    throw new Error("EducaCora already has a contradictory active academic year.");
  }
  academicYear = academicYear ?? (await ensureNamedRow(
    supabase,
    "academic_years",
    { school_id: schoolId, name: yearName },
    {
      school_id: schoolId,
      name: yearName,
      start_date: "2026-09-01",
      end_date: "2027-06-30",
      active: true
    }
  ));

  const course = await ensureNamedRow(
    supabase,
    "courses",
    { school_id: schoolId, academic_year_id: academicYear.id, name: "6º Primaria" },
    {
      school_id: schoolId,
      academic_year_id: academicYear.id,
      name: "6º Primaria"
    }
  );

  const subjects = [];
  for (const name of ["Lengua Castellana", "Matemáticas"]) {
    const subject = await ensureNamedRow(
      supabase,
      "subjects",
      { school_id: schoolId, name },
      { school_id: schoolId, name }
    );
    subjects.push(subject);

    await ensureNamedRow(
      supabase,
      "course_subjects",
      {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        course_id: course.id,
        subject_id: subject.id,
        track: null
      },
      {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        course_id: course.id,
        subject_id: subject.id,
        optional: false,
        track: null
      }
    );
  }

  return { academicYear, course, subjects };
}

async function ensureLegacyPeopleRows(supabase, schoolId, tutor, family) {
  for (const [table, user, payload] of [
    ["teachers", tutor, { name: userDefinitions.tutor.fullName, email: userDefinitions.tutor.email, can_be_tutor: true }],
    ["families", family, { name: userDefinitions.family.fullName, email: userDefinitions.family.email, phone: null }]
  ]) {
    const existing = await dataOrThrow(
      supabase.from(table).select("id,school_id").eq("id", user.id).maybeSingle(),
      `Read legacy ${table} row`
    );
    if (existing && existing.school_id !== schoolId) {
      throw new Error(`The synthetic ${table} identity already belongs to another school.`);
    }
    if (existing) {
      await dataOrThrow(
        supabase.from(table).update({ ...payload, school_id: schoolId }).eq("id", user.id).select("id").single(),
        `Update legacy ${table} row`
      );
    } else {
      await dataOrThrow(
        supabase.from(table).insert({ id: user.id, school_id: schoolId, ...payload }).select("id").single(),
        `Create legacy ${table} row`
      );
    }
  }
}

async function ensureFunctionalDataset(supabase, schoolId, users, structure) {
  await ensureLegacyPeopleRows(supabase, schoolId, users.tutor, users.family);

  const assignments = [];
  for (const subject of structure.subjects) {
    assignments.push(
      await ensureNamedRow(
        supabase,
        "teacher_assignments",
        {
          school_id: schoolId,
          academic_year_id: structure.academicYear.id,
          teacher_id: users.tutor.id,
          course_id: structure.course.id,
          subject_id: subject.id
        },
        {
          school_id: schoolId,
          academic_year_id: structure.academicYear.id,
          teacher_id: users.tutor.id,
          course_id: structure.course.id,
          subject_id: subject.id
        }
      )
    );
  }

  const student = await ensureNamedRow(
    supabase,
    "students",
    { school_id: schoolId, name: "Alumna", last_name: "EducaCora" },
    {
      school_id: schoolId,
      academic_year_id: structure.academicYear.id,
      name: "Alumna",
      last_name: "EducaCora",
      birth_date: "2014-04-15",
      course_id: structure.course.id,
      tutor_teacher_id: users.tutor.id,
      active: true
    }
  );

  await ensureNamedRow(
    supabase,
    "parent_students",
    { school_id: schoolId, parent_id: users.family.id, student_id: student.id },
    { school_id: schoolId, parent_id: users.family.id, student_id: student.id }
  );

  for (const [subjectIndex, subject] of structure.subjects.entries()) {
    for (const [name, weight, criterionType] of [
      ["Trabajo de aula", 50, "proyecto"],
      ["Prueba escrita", 50, "parcial"]
    ]) {
      await ensureNamedRow(
        supabase,
        "evaluation_criteria",
        {
          school_id: schoolId,
          academic_year_id: structure.academicYear.id,
          teacher_id: users.tutor.id,
          course_id: structure.course.id,
          subject_id: subject.id,
          term: "1",
          name
        },
        {
          school_id: schoolId,
          academic_year_id: structure.academicYear.id,
          teacher_id: users.tutor.id,
          course_id: structure.course.id,
          subject_id: subject.id,
          term: "1",
          name,
          weight,
          criterion_type: criterionType,
          visible_to_family: true,
          active: true
        }
      );
    }

    await ensureNamedRow(
      supabase,
      "partial_grades",
      {
        school_id: schoolId,
        academic_year_id: structure.academicYear.id,
        student_id: student.id,
        subject_id: subject.id,
        term: "1",
        assessment_type: "parcial",
        assessment_name: "Prueba inicial"
      },
      {
        school_id: schoolId,
        academic_year_id: structure.academicYear.id,
        student_id: student.id,
        teacher_id: users.tutor.id,
        subject_id: subject.id,
        course_id: structure.course.id,
        term: "1",
        assessment_type: "parcial",
        assessment_name: "Prueba inicial",
        grade: subjectIndex === 0 ? 8 : 7,
        assessment_date: "2026-10-15",
        comment: "Dato académico",
        recommendation: "Seguimiento académico",
        visible_to_family: true
      }
    );

    await ensureNamedRow(
      supabase,
      "term_subject_grades",
      {
        school_id: schoolId,
        academic_year_id: structure.academicYear.id,
        student_id: student.id,
        subject_id: subject.id,
        term: "1"
      },
      {
        school_id: schoolId,
        academic_year_id: structure.academicYear.id,
        student_id: student.id,
        teacher_id: users.tutor.id,
        subject_id: subject.id,
        course_id: structure.course.id,
        term: "1",
        calculated_grade: subjectIndex === 0 ? 8 : 7,
        final_grade: subjectIndex === 0 ? 8 : 7,
        final_observation: "Observación final",
        status: "closed",
        closed_at: "2026-12-18T12:00:00.000Z"
      }
    );
  }

  await ensureNamedRow(
    supabase,
    "evaluation_publications",
    {
      school_id: schoolId,
      academic_year_id: structure.academicYear.id,
      course_id: structure.course.id,
      term: "1"
    },
    {
      school_id: schoolId,
      academic_year_id: structure.academicYear.id,
      course_id: structure.course.id,
      term: "1",
      published: true,
      published_at: "2026-12-19T09:00:00.000Z",
      published_by: users.director.id
    }
  );

  return { student, assignments };
}

async function fingerprintSchool(supabase, schoolId) {
  const result = {};
  for (const table of [
    "academic_years",
    "courses",
    "subjects",
    "course_subjects",
    "students",
    "parent_students",
    "teacher_assignments",
    "evaluation_criteria",
    "partial_grades",
    "term_subject_grades"
  ]) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);
    if (error) {
      throw new Error(`Fingerprint ${table}: ${error.message}`);
    }
    result[table] = count ?? 0;
  }
  return result;
}

async function main() {
  assert(process.argv.includes("--apply"), "Pass --apply to create or reconcile the staging dataset.");
  const supabaseUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  assert(supabaseUrl === STAGING_URL, `Refusing target ${supabaseUrl}. Expected staging.`);
  assert(!serviceRoleKey.includes("higdnodnztismxmusejz"), "A production reference was detected.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const penafort = await dataOrThrow(
    supabase.from("schools").select("*").eq("slug", PENAFORT_SLUG).single(),
    "Read canonical Peñafort school"
  );
  const penafortBefore = await fingerprintSchool(supabase, penafort.id);

  const school = await ensureSchool(supabase);
  const profiles = await dataOrThrow(
    supabase
      .from("profiles")
      .select("id,email,role,active")
      .eq("email", SUPERADMIN_EMAIL)
      .eq("role", "superadmin")
      .eq("active", true),
    "Read canonical active superadmin profile"
  );
  assert(profiles.length === 1, "Expected the canonical active superadmin profile.");
  const superadmin = profiles[0];
  await ensureMembership(supabase, {
    schoolId: school.id,
    userId: superadmin.id,
    role: "superadmin"
  });

  const qaSchool = await dataOrThrow(
    supabase.from("schools").select("id").eq("slug", QA_SCHOOL_SLUG).maybeSingle(),
    "Read QA school"
  );
  if (qaSchool) {
    await dataOrThrow(
      supabase
        .from("school_memberships")
        .update({ active: false })
        .eq("school_id", qaSchool.id)
        .eq("user_id", superadmin.id)
        .eq("role", "superadmin")
        .select("id"),
      "Hide QA School from the canonical superadmin selector"
    );
  }

  const allUsers = await listAllUsers(supabase);
  const usersByEmail = new Map(allUsers.map((user) => [user.email?.toLowerCase(), user]));
  if (
    !existsSync(credentialsPath) &&
    Object.values(userDefinitions).some((definition) =>
      usersByEmail.has(definition.email.toLowerCase())
    )
  ) {
    throw new Error(
      "Synthetic EducaCora users already exist but the ignored credential file is missing. Refusing to create or reset credentials."
    );
  }
  const { credentials, existed } = loadOrCreateCredentials();
  const users = {};
  for (const key of Object.keys(userDefinitions)) {
    users[key] = await ensureUser(supabase, usersByEmail, key, credentials, existed);
    await ensureMembership(supabase, {
      schoolId: school.id,
      userId: users[key].id,
      role: userDefinitions[key].role
    });
  }

  const structure = await ensureAcademicStructure(supabase, school.id);
  const dataset = await ensureFunctionalDataset(supabase, school.id, users, structure);

  const superadminSchools = await dataOrThrow(
    supabase
      .from("school_memberships")
      .select("school_id,schools!inner(slug,active)")
      .eq("user_id", superadmin.id)
      .eq("role", "superadmin")
      .eq("active", true)
      .eq("schools.active", true),
    "Verify superadmin selector memberships"
  );
  const selectorSlugs = superadminSchools.map((row) => row.schools.slug).sort();
  assert(
    JSON.stringify(selectorSlugs) === JSON.stringify([PENAFORT_SLUG, SCHOOL_SLUG].sort()),
    `Unexpected canonical selector schools: ${selectorSlugs.join(", ")}`
  );

  const penafortAfter = await fingerprintSchool(supabase, penafort.id);
  assert(
    JSON.stringify(penafortBefore) === JSON.stringify(penafortAfter),
    "The Peñafort operational fingerprint changed during bootstrap."
  );

  console.log(
    JSON.stringify(
      {
        target: "STAGING",
        projectRef: STAGING_REF,
        school: { slug: school.slug, id: `${school.id.slice(0, 8)}…${school.id.slice(-4)}` },
        selectorSlugs,
        academic: {
          years: 1,
          courses: 1,
          subjects: structure.subjects.length,
          courseSubjects: structure.subjects.length
        },
        users: Object.keys(users),
        dataset: { students: 1, relations: 1, assignments: dataset.assignments.length },
        credentialsPath,
        penafortFingerprintUnchanged: true
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown bootstrap error.");
  process.exitCode = 1;
});
