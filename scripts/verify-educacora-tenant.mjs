import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "zhnbrpcekmxldxlqrbhr";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const EDUCACORA_SLUG = "educacora";
const PENAFORT_SLUG = "colegio-penafort";
const DATASET_TAG = "20_2N1";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const credentialsPath = resolve(repositoryRoot, ".local", "educacora-test-credentials.txt");

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

async function dataOrThrow(promise, label) {
  const { data, error } = await promise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

function clientFor(url, key) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
}

async function signIn(url, anonKey, email, password) {
  const client = clientFor(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Authenticate ${email}: ${error.message}`);
  }
  return client;
}

async function signInAsExistingSuperadmin(admin, url, anonKey, email) {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email
  });
  if (linkError) {
    throw new Error(`Generate local superadmin verification link: ${linkError.message}`);
  }
  const tokenHash = linkData.properties?.hashed_token;
  assert(tokenHash, "Supabase did not return a superadmin token hash.");

  const client = clientFor(url, anonKey);
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) {
    throw new Error(`Authenticate existing superadmin: ${error.message}`);
  }
  return client;
}

async function assertOwnMembership(client, expectedSchoolId, expectedRole) {
  const memberships = await dataOrThrow(
    client
      .from("school_memberships")
      .select("school_id,role,active")
      .eq("active", true),
    `${expectedRole} own memberships`
  );
  assert(memberships.length === 1, `${expectedRole} must have exactly one active membership.`);
  assert(memberships[0].school_id === expectedSchoolId, `${expectedRole} membership points to another tenant.`);
  assert(memberships[0].role === expectedRole, `${expectedRole} membership has the wrong role.`);

  const schools = await dataOrThrow(
    client.from("schools").select("id,slug").eq("active", true),
    `${expectedRole} visible schools`
  );
  assert(schools.length === 1, `${expectedRole} can see an unexpected number of schools.`);
  assert(schools[0].slug === EDUCACORA_SLUG, `${expectedRole} can see another tenant.`);
}

async function assertNoCrossTenantRead(client, table, penafortId, label) {
  const rows = await dataOrThrow(
    client.from(table).select("id").eq("school_id", penafortId),
    label
  );
  assert(rows.length === 0, `${label} exposed Peñafort rows.`);
}

async function main() {
  const url = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  assert(url === STAGING_URL, `Refusing target ${url}. Expected staging.`);
  assert(existsSync(credentialsPath), "The ignored EducaCora credential file is missing.");
  const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
  assert(credentials.projectRef === STAGING_REF, "Credentials point to another project.");

  const admin = clientFor(url, serviceRoleKey);
  const schools = await dataOrThrow(
    admin.from("schools").select("*").in("slug", [EDUCACORA_SLUG, PENAFORT_SLUG]),
    "Read canonical schools"
  );
  const educacora = schools.find((school) => school.slug === EDUCACORA_SLUG);
  const penafort = schools.find((school) => school.slug === PENAFORT_SLUG);
  assert(educacora?.active && educacora.status === "active", "EducaCora is not active.");
  assert(penafort?.active && penafort.status === "active", "Peñafort is not active.");

  const superadmins = await dataOrThrow(
    admin.from("profiles").select("id,email").eq("role", "superadmin").eq("active", true),
    "Read active superadmin"
  );
  assert(superadmins.length === 1 && superadmins[0].email, "Expected one active superadmin with email.");
  const superadminClient = await signInAsExistingSuperadmin(
    admin,
    url,
    anonKey,
    superadmins[0].email
  );
  const selectorMemberships = await dataOrThrow(
    superadminClient
      .from("school_memberships")
      .select("school_id,role,active,schools!inner(slug,active)")
      .eq("role", "superadmin")
      .eq("active", true)
      .eq("schools.active", true),
    "Read superadmin selector memberships"
  );
  const selectorSlugs = selectorMemberships.map((row) => row.schools.slug).sort();
  assert(
    JSON.stringify(selectorSlugs) === JSON.stringify([EDUCACORA_SLUG, PENAFORT_SLUG].sort()),
    `Selector memberships are not canonical: ${selectorSlugs.join(", ")}`
  );

  const roleClients = {};
  for (const role of ["director", "tutor", "family"]) {
    const localUser = credentials.users[role];
    roleClients[role] = await signIn(url, anonKey, localUser.email, localUser.password);
    await assertOwnMembership(roleClients[role], educacora.id, role);
  }

  for (const role of ["director", "tutor", "family"]) {
    await assertNoCrossTenantRead(
      roleClients[role],
      "courses",
      penafort.id,
      `${role} cross-tenant course read`
    );
  }

  const directorStudents = await dataOrThrow(
    roleClients.director
      .from("students")
      .select("id,school_id,name,last_name")
      .eq("school_id", educacora.id),
    "Director EducaCora students"
  );
  assert(directorStudents.length === 1, "Director cannot see the single EducaCora student.");

  const tutorStudents = await dataOrThrow(
    roleClients.tutor
      .from("students")
      .select("id,school_id,name,last_name")
      .eq("school_id", educacora.id),
    "Tutor EducaCora students"
  );
  assert(tutorStudents.length === 1, "Tutor cannot see the assigned EducaCora student.");

  const familyRelations = await dataOrThrow(
    roleClients.family
      .from("parent_students")
      .select("student_id,school_id")
      .eq("school_id", educacora.id),
    "Family EducaCora relation"
  );
  assert(familyRelations.length === 1, "Family cannot see its EducaCora relation.");
  const familyGrades = await dataOrThrow(
    roleClients.family
      .from("partial_grades")
      .select("id,school_id,assessment_name")
      .eq("school_id", educacora.id)
      .eq("visible_to_family", true),
    "Family visible EducaCora grades"
  );
  assert(familyGrades.length >= 1, "Family cannot see any visible EducaCora grade.");

  const academicYear = await dataOrThrow(
    admin.from("academic_years").select("id").eq("school_id", educacora.id).eq("active", true).single(),
    "Read EducaCora academic year"
  );
  const course = await dataOrThrow(
    admin.from("courses").select("id").eq("school_id", educacora.id).eq("academic_year_id", academicYear.id).single(),
    "Read EducaCora course"
  );
  const subject = await dataOrThrow(
    admin.from("subjects").select("id").eq("school_id", educacora.id).order("name").limit(1).single(),
    "Read EducaCora subject"
  );
  const tutorUser = await roleClients.tutor.auth.getUser();
  assert(!tutorUser.error && tutorUser.data.user, "Tutor session is unavailable.");

  const crossAssessmentName = `Forbidden cross-tenant ${DATASET_TAG}`;
  const { error: crossWriteError } = await roleClients.tutor.from("partial_grades").insert({
    school_id: penafort.id,
    academic_year_id: academicYear.id,
    student_id: tutorStudents[0].id,
    teacher_id: tutorUser.data.user.id,
    subject_id: subject.id,
    course_id: course.id,
    term: "1",
    assessment_type: "parcial",
    assessment_name: crossAssessmentName,
    grade: 5,
    visible_to_family: false
  });
  assert(crossWriteError, "A cross-tenant Tutor write unexpectedly succeeded.");
  const crossRows = await dataOrThrow(
    admin.from("partial_grades").select("id").eq("assessment_name", crossAssessmentName),
    "Verify rejected cross-tenant write"
  );
  assert(crossRows.length === 0, "A rejected cross-tenant row persisted.");

  const { error: familyWriteError } = await roleClients.family.from("partial_grades").insert({
    school_id: educacora.id,
    academic_year_id: academicYear.id,
    student_id: tutorStudents[0].id,
    teacher_id: tutorUser.data.user.id,
    subject_id: subject.id,
    course_id: course.id,
    term: "1",
    assessment_type: "parcial",
    assessment_name: `Forbidden family write ${DATASET_TAG}`,
    grade: 5,
    visible_to_family: true
  });
  assert(familyWriteError, "A Family grade write unexpectedly succeeded.");

  const counts = {};
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
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("school_id", educacora.id);
    if (error) {
      throw new Error(`Count ${table}: ${error.message}`);
    }
    counts[table] = count ?? 0;
  }

  console.log(
    JSON.stringify(
      {
        target: "STAGING",
        selector: { schools: selectorSlugs, educacoraVisible: true, qaSchoolVisible: false },
        activeContextSequenceCoveredByLocalVerifier: [
          PENAFORT_SLUG,
          EDUCACORA_SLUG,
          PENAFORT_SLUG
        ],
        roles: { director: "PASS", tutor: "PASS", family: "PASS" },
        crossTenantReads: 0,
        crossTenantWrites: 0,
        familyVisibleGrades: familyGrades.length,
        counts
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown verification error.");
  process.exitCode = 1;
});
