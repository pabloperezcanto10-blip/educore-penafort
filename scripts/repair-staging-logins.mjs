import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "zhnbrpcekmxldxlqrbhr";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const PENAFORT_SLUG = "colegio-penafort";
const EDUCACORA_SLUG = "educacora";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const credentialsPath = resolve(
  repositoryRoot,
  ".local",
  "educacora-test-credentials.txt"
);

const accountDefinitions = [
  {
    key: "superadmin",
    label: "Admin",
    email: "admin@penafortplatform.com",
    fullName: "Superadmin global",
    role: "superadmin",
    schoolSlugs: [PENAFORT_SLUG, EDUCACORA_SLUG]
  },
  {
    key: "director",
    label: "Dir",
    email: "director@educacora.example.test",
    fullName: "Dirección EducaCora",
    role: "director",
    schoolSlugs: [EDUCACORA_SLUG]
  },
  {
    key: "tutor",
    label: "Tutor",
    email: "tutor@educacora.example.test",
    fullName: "Tutor EducaCora",
    role: "tutor",
    schoolSlugs: [EDUCACORA_SLUG]
  },
  {
    key: "family",
    label: "Familia",
    email: "familia@educacora.example.test",
    fullName: "Familia EducaCora",
    role: "family",
    schoolSlugs: [EDUCACORA_SLUG]
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requiredEnvironment(name) {
  const value = process.env[name];
  assert(value, `${name} is required.`);
  return value;
}

function createPassword(label) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  const suffix = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
  return `EducaCora-${label}-2026!${suffix}`;
}

function clientFor(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

async function dataOrThrow(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function listAllUsers(admin) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`List staging Auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 100) return users;
  }
}

async function repairMemberships(admin, account, userId, schoolsBySlug) {
  const desired = new Map(
    account.schoolSlugs.map((slug) => [schoolsBySlug.get(slug).id, account.role])
  );
  const existing = await dataOrThrow(
    admin
      .from("school_memberships")
      .select("id,school_id,role,active")
      .eq("user_id", userId),
    `Read ${account.key} memberships`
  );

  for (const membership of existing) {
    const expectedRole = desired.get(membership.school_id);
    if ((!expectedRole || membership.role !== expectedRole) && membership.active) {
      await dataOrThrow(
        admin
          .from("school_memberships")
          .update({ active: false })
          .eq("id", membership.id)
          .select("id")
          .single(),
        `Deactivate contradictory ${account.key} membership`
      );
    }
  }

  for (const [schoolId, role] of desired) {
    const matching = existing.find(
      (membership) =>
        membership.school_id === schoolId && membership.role === role
    );
    if (matching) {
      await dataOrThrow(
        admin
          .from("school_memberships")
          .update({ active: true })
          .eq("id", matching.id)
          .select("id")
          .single(),
        `Activate ${account.key} membership`
      );
    } else {
      await dataOrThrow(
        admin
          .from("school_memberships")
          .insert({
            id: randomUUID(),
            school_id: schoolId,
            user_id: userId,
            role,
            active: true
          })
          .select("id")
          .single(),
        `Create ${account.key} membership`
      );
    }
  }
}

async function verifyPassword(url, anonKey, account, password) {
  const client = clientFor(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: account.email,
    password
  });
  if (error) {
    throw new Error(`Authenticate ${account.key}: ${error.code ?? error.message}`);
  }
  assert(data.user, `${account.key} Auth login returned no user.`);
  assert(data.session, `${account.key} Auth login returned no session.`);
  await client.auth.signOut();
  return { login: "PASS", userReturned: true, sessionCreated: true };
}

function writeCredentials(credentials) {
  const sections = [
    "STAGING — NO PRODUCCIÓN",
    "",
    "SUPERADMIN GLOBAL",
    "Centros: Colegio Peñafort y Colegio EducaCora",
    `Email: ${credentials.superadmin.email}`,
    `Contraseña: ${credentials.superadmin.password}`,
    "Auth: PASS",
    "Peñafort: PENDIENTE",
    "EducaCora: PENDIENTE",
    "",
    "DIRECTOR EDUCACORA",
    `Email: ${credentials.director.email}`,
    `Contraseña: ${credentials.director.password}`,
    "Auth: PASS",
    "Dashboard: PENDIENTE",
    "",
    "TUTOR EDUCACORA",
    `Email: ${credentials.tutor.email}`,
    `Contraseña: ${credentials.tutor.password}`,
    "Auth: PASS",
    "Dashboard: PENDIENTE",
    "",
    "FAMILIA EDUCACORA",
    `Email: ${credentials.family.email}`,
    `Contraseña: ${credentials.family.password}`,
    "Auth: PASS",
    "Dashboard: PENDIENTE",
    ""
  ];

  mkdirSync(dirname(credentialsPath), { recursive: true });
  writeFileSync(credentialsPath, sections.join("\n"), {
    encoding: "utf8",
    mode: 0o600
  });
}

async function main() {
  assert(process.argv.includes("--apply"), "Pass --apply to repair staging logins.");
  const url = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  assert(url === STAGING_URL, `Refusing target ${url}. Expected staging.`);

  const admin = clientFor(url, serviceRoleKey);
  const schools = await dataOrThrow(
    admin
      .from("schools")
      .select("id,slug,name,active,status")
      .in("slug", [PENAFORT_SLUG, EDUCACORA_SLUG]),
    "Read staging schools"
  );
  assert(schools.length === 2, "Expected the two canonical staging schools.");
  assert(
    schools.every((school) => school.active && school.status === "active"),
    "Both staging schools must be active."
  );
  const schoolsBySlug = new Map(schools.map((school) => [school.slug, school]));

  const allUsers = await listAllUsers(admin);
  const credentials = {};
  const verification = {};

  for (const account of accountDefinitions) {
    const matches = allUsers.filter(
      (user) => user.email?.toLowerCase() === account.email.toLowerCase()
    );
    assert(matches.length === 1, `${account.email} must identify exactly one Auth user.`);
    const user = matches[0];
    const password = createPassword(account.label);

    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          full_name: account.fullName
        }
      }
    );
    if (updateError || !updated.user) {
      throw new Error(`Repair ${account.key} Auth user: ${updateError?.message}`);
    }

    await dataOrThrow(
      admin
        .from("profiles")
        .update({
          email: account.email,
          full_name: account.fullName,
          role: account.role,
          active: true,
          must_change_password: false
        })
        .eq("id", user.id)
        .select("id")
        .single(),
      `Repair ${account.key} profile`
    );

    await repairMemberships(admin, account, user.id, schoolsBySlug);
    credentials[account.key] = { email: account.email, password };
  }

  for (const account of accountDefinitions) {
    verification[account.key] = await verifyPassword(
      url,
      anonKey,
      account,
      credentials[account.key].password
    );
  }

  writeCredentials(credentials);

  console.log(
    JSON.stringify(
      {
        target: "STAGING",
        projectRef: STAGING_REF,
        accountsRepaired: accountDefinitions.map(({ key, email, role, schoolSlugs }) => ({
          key,
          email,
          role,
          schoolSlugs
        })),
        authVerification: verification,
        credentialsPath,
        passwordsPrinted: false
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown staging repair error.");
  process.exitCode = 1;
});
