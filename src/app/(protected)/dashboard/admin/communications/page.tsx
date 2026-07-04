import Link from "next/link";
import { Eye, Forward, Inbox, MailOpen, MessageCircleReply, Search, Star } from "lucide-react";
import { getAdminCourses, getAdminProfiles, getAdminStudents, getProfileDisplayName, getStudentDisplayName, type AdminProfile } from "@/lib/admin/admin";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  closeAdminConversation,
  forwardAdminCommunication,
  markAdminConversationImportant,
  markAdminConversationRead,
  reopenAdminConversation,
  replyToAdminCommunication
} from "./actions";

type PageProps = {
  searchParams: {
    c?: string;
    q?: string;
    chip?: string;
    advanced?: string;
    course_id?: string;
    student_id?: string;
    sender_id?: string;
    receiver_id?: string;
    category?: string;
    status?: string;
  };
};

type AdminCommunication = {
  id: string;
  sender_id: string;
  receiver_id: string;
  student_id: string | null;
  title: string;
  message: string;
  category: string;
  read: boolean;
  read_at: string | null;
  status: "open" | "closed";
  created_at: string;
};

type ProfileLabel = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

type StudentLabel = {
  id: string;
  name: string;
  last_name: string;
  course_id: string;
};

type CourseLabel = {
  id: string;
  name: string;
};

type LabeledCommunication = AdminCommunication & {
  senderName: string;
  senderRole: string;
  receiverName: string;
  receiverRole: string;
  studentName: string;
  courseId: string | null;
  courseName: string;
};

type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  lastMessage: LabeledCommunication;
  messages: LabeledCommunication[];
  unreadCount: number;
  tags: string[];
  isImportant: boolean;
  isClosed: boolean;
};

type AdminCommunicationClient = ReturnType<typeof createAdminClient>;
type NotificationCategory = "incidencia" | "académico" | "tutoría" | "general";

const chips = [
  { value: "", label: "Todos" },
  { value: "unread", label: "No leidos" },
  { value: "families", label: "Familias" },
  { value: "teachers", label: "Docentes" },
  { value: "courses", label: "Cursos" },
  { value: "important", label: "Importantes" }
];

const categories = [
  { value: "incidencia", label: "Incidencia" },
  { value: "académico", label: "Academico" },
  { value: "tutoría", label: "Tutoria" },
  { value: "general", label: "General" }
];

export default async function AdminCommunicationsPage({ searchParams }: PageProps) {
  await requireRole("superadmin");
  const [
    { communications, errorMessage },
    { courses },
    { students },
    { profiles }
  ] = await Promise.all([
    getAdminCommunications(searchParams),
    getAdminCourses(),
    getAdminStudents(),
    getAdminProfiles()
  ]);
  const advancedFiltered = applyAdvancedFilters(communications, searchParams);
  const conversations = filterConversations(buildConversations(advancedFiltered), searchParams);
  const selectedConversation = searchParams.c
    ? conversations.find((conversation) => conversation.id === searchParams.c) ?? null
    : null;
  const activeProfiles = profiles.filter((profile) => profile.active);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Comunicaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bandeja centralizada para supervisar, responder y reenviar comunicaciones del centro.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </header>

      <section className="rounded-lg border border-border bg-white">
        <div className="grid min-h-[700px] lg:grid-cols-[380px_1fr]">
          <aside className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <Inbox className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">Conversaciones</h2>
                <p className="text-sm text-muted-foreground">{conversations.length} conversaciones</p>
              </div>
            </div>

            <SearchAndChips searchParams={searchParams} />
            <AdvancedFilters courses={courses} students={students} profiles={profiles} searchParams={searchParams} />

            {errorMessage ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                No se pudieron cargar las comunicaciones: {errorMessage}
              </div>
            ) : conversations.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay conversaciones para esta busqueda.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {conversations.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === selectedConversation?.id}
                    searchParams={searchParams}
                  />
                ))}
              </div>
            )}
          </aside>

          <ConversationDetail conversation={selectedConversation} profiles={activeProfiles} />
        </div>
      </section>
    </section>
  );
}

function SearchAndChips({ searchParams }: { searchParams: PageProps["searchParams"] }) {
  return (
    <div className="mt-5 space-y-3">
      <form className="flex gap-2">
        <input type="hidden" name="chip" value={searchParams.chip ?? ""} />
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Buscar persona, alumno, curso o mensaje"
            className="h-11 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <button className="h-11 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">Buscar</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.label}
            href={hrefWith(searchParams, { chip: chip.value, c: undefined })}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              (searchParams.chip ?? "") === chip.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-muted-foreground hover:bg-muted"
            }`}
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function AdvancedFilters({
  courses,
  students,
  profiles,
  searchParams
}: {
  courses: { id: string; name: string }[];
  students: { id: string; name: string; last_name: string; course_id: string }[];
  profiles: AdminProfile[];
  searchParams: PageProps["searchParams"];
}) {
  const visibleStudents = students.filter((student) => !searchParams.course_id || student.course_id === searchParams.course_id);

  return (
    <details className="mt-3 rounded-md border border-border bg-secondary/40 p-3" open={searchParams.advanced === "1"}>
      <summary className="cursor-pointer text-sm font-semibold text-foreground">Filtros avanzados</summary>
      <form className="mt-3 grid gap-2">
        <input type="hidden" name="advanced" value="1" />
        <input type="hidden" name="q" value={searchParams.q ?? ""} />
        <input type="hidden" name="chip" value={searchParams.chip ?? ""} />
        <Select name="course_id" value={searchParams.course_id ?? ""} options={courses.map((course) => ({ value: course.id, label: course.name }))} emptyLabel="Todos los cursos" />
        <Select name="student_id" value={searchParams.student_id ?? ""} options={visibleStudents.map((student) => ({ value: student.id, label: getStudentDisplayName(student) }))} emptyLabel="Todos los alumnos" />
        <Select name="sender_id" value={searchParams.sender_id ?? ""} options={profiles.map((profile) => ({ value: profile.id, label: getProfileDisplayName(profile) }))} emptyLabel="Todos los remitentes" />
        <Select name="receiver_id" value={searchParams.receiver_id ?? ""} options={profiles.map((profile) => ({ value: profile.id, label: getProfileDisplayName(profile) }))} emptyLabel="Todos los destinatarios" />
        <Select name="category" value={searchParams.category ?? ""} options={categories} emptyLabel="Todas las categorias" />
        <Select name="status" value={searchParams.status ?? ""} options={[{ value: "unread", label: "No leidas" }, { value: "read", label: "Leidas" }]} emptyLabel="Leidas y no leidas" />
        <button className="h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">Aplicar</button>
      </form>
    </details>
  );
}

function ConversationListItem({
  conversation,
  active,
  searchParams
}: {
  conversation: Conversation;
  active: boolean;
  searchParams: PageProps["searchParams"];
}) {
  return (
    <Link
      href={hrefWith(searchParams, { c: conversation.id })}
      className={`block rounded-lg border p-3 transition ${
        active ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-muted"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{conversation.title}</p>
            {conversation.unreadCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {conversation.unreadCount}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.subtitle}</p>
        </div>
        <time className="shrink-0 text-xs text-muted-foreground">{formatShortDate(conversation.lastMessage.created_at)}</time>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{conversation.lastMessage.message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge>{getCategoryLabel(conversation.lastMessage.category)}</Badge>
        {conversation.lastMessage.courseName !== "Sin curso" ? <Badge>{conversation.lastMessage.courseName}</Badge> : null}
        {conversation.isClosed ? <Badge>Cerrada</Badge> : null}
        {conversation.unreadCount > 0 ? <span className="h-2 w-2 rounded-full bg-primary" aria-label="No leida" /> : null}
      </div>
    </Link>
  );
}

function ConversationDetail({
  conversation,
  profiles
}: {
  conversation: Conversation | null;
  profiles: AdminProfile[];
}) {
  if (!conversation) {
    return (
      <main className="flex min-h-[520px] items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <Inbox className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-foreground">Selecciona una conversacion</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aqui veras el hilo cronologico y las acciones de supervision.</p>
        </div>
      </main>
    );
  }

  const messages = [...conversation.messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const latest = conversation.lastMessage;
  const allIds = conversation.messages.map((message) => message.id);

  return (
    <main className="flex min-h-[700px] flex-col">
      <header className="border-b border-border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{conversation.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{conversation.subtitle}</p>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Remitente" value={latest.senderName} />
              <Info label="Destinatario" value={latest.receiverName} />
              <Info label="Alumno" value={latest.studentName} />
              <Info label="Curso" value={latest.courseName} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{getCategoryLabel(latest.category)}</Badge>
              {latest.courseName !== "Sin curso" ? <Badge>{latest.courseName}</Badge> : null}
              <Badge>{conversation.isClosed ? "Cerrada" : "Abierta"}</Badge>
              {conversation.unreadCount > 0 ? <Badge>{`${conversation.unreadCount} sin leer`}</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={markAdminConversationRead}>
              <input type="hidden" name="communication_ids" value={allIds.join(",")} />
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
                <MailOpen className="h-4 w-4" aria-hidden="true" />
                Marcar leido
              </button>
            </form>
            {conversation.isClosed ? (
              <form action={reopenAdminConversation}>
                <input type="hidden" name="communication_ids" value={allIds.join(",")} />
                <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
                  Reabrir conversacion
                </button>
              </form>
            ) : (
              <form action={closeAdminConversation}>
                <input type="hidden" name="communication_ids" value={allIds.join(",")} />
                <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
                  Cerrar conversacion
                </button>
              </form>
            )}
            <form action={markAdminConversationImportant}>
              <input type="hidden" name="communication_ids" value={allIds.join(",")} />
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
                <Star className="h-4 w-4" aria-hidden="true" />
                Importante
              </button>
            </form>
            {latest.student_id ? (
              <Link
                href={`/dashboard/admin/students/${latest.student_id}`}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Ver ficha alumno
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto bg-background p-5">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <footer className="space-y-4 border-t border-border p-5">
        {conversation.isClosed ? (
          <p className="rounded-md border border-border bg-white p-3 text-sm text-muted-foreground">
            Conversacion cerrada. Reabrela para responder o reenviar.
          </p>
        ) : (
        <form action={replyToAdminCommunication} className="flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="communication_id" value={latest.id} />
          <input
            name="message"
            required
            placeholder="Responder como superadmin"
            className="h-11 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <MessageCircleReply className="h-4 w-4" aria-hidden="true" />
            Responder
          </button>
        </form>
        )}

        {conversation.isClosed ? null : (
        <form action={forwardAdminCommunication} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="communication_id" value={latest.id} />
          <Select
            name="receiver_id"
            value=""
            options={profiles.map((profile) => ({ value: profile.id, label: getProfileDisplayName(profile) }))}
            emptyLabel="Reenviar a docente o familia"
          />
          <input
            name="message"
            placeholder="Nota opcional para el reenvio"
            className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold transition hover:bg-muted">
            <Forward className="h-4 w-4" aria-hidden="true" />
            Reenviar
          </button>
        </form>
        )}
      </footer>
    </main>
  );
}

function MessageBubble({ message }: { message: LabeledCommunication }) {
  return (
    <article className="flex justify-start">
      <div className="max-w-2xl rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{message.senderName}</span>
          <span>para</span>
          <span className="font-semibold text-foreground">{message.receiverName}</span>
          <span>{formatDate(message.created_at)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{getCategoryLabel(message.category)}</Badge>
          <Badge>{message.read ? "Leido" : "No leido"}</Badge>
          <Badge>{message.status === "closed" ? "Cerrada" : "Abierta"}</Badge>
          {message.studentName !== "Sin alumno" ? <Badge>{message.studentName}</Badge> : null}
          {message.courseName !== "Sin curso" ? <Badge>{message.courseName}</Badge> : null}
        </div>
        <h3 className="mt-3 text-sm font-semibold text-foreground">{message.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{message.message}</p>
      </div>
    </article>
  );
}

async function getAdminCommunications(filters: PageProps["searchParams"]): Promise<{
  communications: LabeledCommunication[];
  errorMessage: string | null;
}> {
  const supabase = await createCommunicationClient();
  let query = supabase
    .from("notifications")
    .select("id,sender_id,receiver_id,student_id,title,message,category,read,read_at,status,created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (filters.student_id) query = query.eq("student_id", filters.student_id);
  if (filters.sender_id) query = query.eq("sender_id", filters.sender_id);
  if (filters.receiver_id) query = query.eq("receiver_id", filters.receiver_id);
  if (filters.category) query = query.eq("category", filters.category as NotificationCategory);
  if (filters.status === "read") query = query.eq("read", true);
  if (filters.status === "unread") query = query.eq("read", false);

  const { data, error } = await query.returns<AdminCommunication[]>();

  if (error) {
    return { communications: [], errorMessage: error.message };
  }

  return attachCommunicationLabels(data ?? [], filters.course_id);
}

async function attachCommunicationLabels(
  rows: AdminCommunication[],
  courseFilterId?: string
): Promise<{
  communications: LabeledCommunication[];
  errorMessage: string | null;
}> {
  if (rows.length === 0) {
    return { communications: [], errorMessage: null };
  }

  const supabase = await createCommunicationClient();
  const profileIds = Array.from(new Set(rows.flatMap((row) => [row.sender_id, row.receiver_id])));
  const studentIds = Array.from(new Set(rows.map((row) => row.student_id).filter((id): id is string => Boolean(id))));
  const [
    { data: profiles, error: profilesError },
    { data: students, error: studentsError }
  ] = await Promise.all([
    supabase.from("profiles").select("id,email,full_name,role").in("id", profileIds).returns<ProfileLabel[]>(),
    studentIds.length > 0
      ? supabase.from("students").select("id,name,last_name,course_id").in("id", studentIds).returns<StudentLabel[]>()
      : Promise.resolve({ data: [] as StudentLabel[], error: null })
  ]);
  const firstError = profilesError?.message ?? studentsError?.message ?? null;

  if (firstError) {
    return { communications: [], errorMessage: firstError };
  }

  const courseIds = Array.from(new Set((students ?? []).map((student) => student.course_id)));
  const { data: courses, error: coursesError } =
    courseIds.length > 0
      ? await supabase.from("courses").select("id,name").in("id", courseIds).returns<CourseLabel[]>()
      : { data: [] as CourseLabel[], error: null };

  if (coursesError) {
    return { communications: [], errorMessage: coursesError.message };
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const communications = rows
    .map((row) => {
      const sender = profilesById.get(row.sender_id);
      const receiver = profilesById.get(row.receiver_id);
      const student = row.student_id ? studentsById.get(row.student_id) : null;
      const course = student ? coursesById.get(student.course_id) : null;

      return {
        ...row,
        senderName: sender?.full_name ?? sender?.email ?? row.sender_id,
        senderRole: sender?.role ?? "unknown",
        receiverName: receiver?.full_name ?? receiver?.email ?? row.receiver_id,
        receiverRole: receiver?.role ?? "unknown",
        studentName: student ? `${student.name} ${student.last_name}` : row.student_id ?? "Sin alumno",
        courseId: student?.course_id ?? null,
        courseName: course?.name ?? "Sin curso"
      };
    })
    .filter((communication) => !courseFilterId || communication.courseId === courseFilterId);

  return { communications, errorMessage: null };
}

function buildConversations(communications: LabeledCommunication[]) {
  const groups = new Map<string, LabeledCommunication[]>();

  communications.forEach((communication) => {
    const participants = [communication.sender_id, communication.receiver_id].sort().join(":");
    const studentPart = communication.student_id ?? "no-student";
    const subjectPart = normalizeSubject(communication.title);
    const coursePart = communication.courseId ?? "no-course";
    const key = `${studentPart}:${participants}:${subjectPart}:${communication.category}:${coursePart}`;
    groups.set(key, [...(groups.get(key) ?? []), communication]);
  });

  return Array.from(groups.entries())
    .map(([id, messages]) => {
      const sorted = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const lastMessage = sorted[0];
      const roles = new Set(messages.flatMap((message) => [message.senderRole, message.receiverRole]));
      const hasFamily = roles.has("family");
      const hasTeacher = roles.has("tutor");
      const title =
        lastMessage.studentName !== "Sin alumno"
          ? lastMessage.studentName
          : `${lastMessage.senderName} / ${lastMessage.receiverName}`;
      const tags = Array.from(
        new Set([
          hasFamily ? "familia" : "",
          hasTeacher ? "docente" : "",
          lastMessage.courseName !== "Sin curso" ? "curso" : "",
          getCategoryLabel(lastMessage.category),
          lastMessage.title.startsWith("[Importante]") ? "importante" : ""
        ].filter(Boolean))
      );

      return {
        id,
        title: `${title} · ${normalizeSubject(lastMessage.title)}`,
        subtitle: `${lastMessage.senderName} - ${lastMessage.receiverName}`,
        lastMessage,
        messages: sorted,
        unreadCount: messages.filter((message) => !message.read).length,
        tags,
        isImportant: messages.some((message) => message.title.startsWith("[Importante]")),
        isClosed: messages.length > 0 && messages.every((message) => message.status === "closed")
      };
    })
    .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
}

function filterConversations(conversations: Conversation[], searchParams: PageProps["searchParams"]) {
  const query = (searchParams.q ?? "").trim().toLowerCase();
  const chip = searchParams.chip ?? "";

  return conversations.filter((conversation) => {
    if (query) {
      const haystack = [
        conversation.title,
        conversation.subtitle,
        conversation.lastMessage.title,
        conversation.lastMessage.message,
        conversation.lastMessage.studentName,
        conversation.lastMessage.courseName,
        ...conversation.tags
      ].join(" ").toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    if (chip === "unread" && conversation.unreadCount === 0) return false;
    if (chip === "families" && !conversation.tags.includes("familia")) return false;
    if (chip === "teachers" && !conversation.tags.includes("docente")) return false;
    if (chip === "courses" && !conversation.tags.includes("curso")) return false;
    if (chip === "important" && !conversation.isImportant) return false;

    return true;
  });
}

function applyAdvancedFilters(communications: LabeledCommunication[], searchParams: PageProps["searchParams"]) {
  return communications.filter((communication) => {
    if (searchParams.course_id && communication.courseId !== searchParams.course_id) return false;
    return true;
  });
}

function Select({
  name,
  value,
  options,
  emptyLabel
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  emptyLabel: string | null;
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
    >
      {emptyLabel !== null ? <option value="">{emptyLabel}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium uppercase">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium">{children}</span>;
}

async function createCommunicationClient(): Promise<AdminCommunicationClient> {
  if (hasSupabaseAdminClient()) {
    return createAdminClient();
  }

  return (await createClient()) as unknown as AdminCommunicationClient;
}

function hrefWith(searchParams: PageProps["searchParams"], updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/dashboard/admin/communications?${query}` : "/dashboard/admin/communications";
}

function getCategoryLabel(category: string) {
  return categories.find((item) => item.value === category)?.label ?? category;
}

function normalizeSubject(value: string) {
  return value
    .replace(/^(\s*(re|fw|fwd)\s*:\s*)+/gi, "")
    .replace(/^\[Importante\]\s*/i, "")
    .trim() || "Sin asunto";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}
