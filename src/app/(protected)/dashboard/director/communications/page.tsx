import Link from "next/link";
import { Forward, Inbox, MailOpen, MessageCircleReply, Search, Send, Star } from "lucide-react";
import {
  type AdminProfile,
  getAdminCourses,
  getAdminProfiles,
  getProfileDisplayName,
  getStudentDisplayName
} from "@/lib/admin/admin";
import { requireRole } from "@/lib/auth/session";
import { getDirectorStudents } from "@/lib/director/students";
import { getDirectorCommunications, type DirectorCommunication } from "@/lib/communications/notifications";
import { DirectorNewCommunicationForm } from "@/components/communications/director-new-communication-form";
import {
  closeDirectorConversation,
  forwardDirectorCommunication,
  markDirectorConversationImportant,
  markDirectorConversationRead,
  reopenDirectorConversation,
  replyToDirectorCommunication,
  sendDirectorCommunication
} from "./actions";

type DirectorCommunicationsPageProps = {
  searchParams: {
    c?: string;
    q?: string;
    chip?: string;
    advanced?: string;
    student_id?: string;
    course_id?: string;
    sender_id?: string;
    receiver_id?: string;
    category?: string;
    status?: string;
    direction?: string;
    director_only?: string;
  };
};

type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  lastMessage: DirectorCommunication;
  messages: DirectorCommunication[];
  unreadCount: number;
  tags: string[];
  isImportant: boolean;
  isSupervised: boolean;
  isClosed: boolean;
};

const categories = [
  { value: "incidencia", label: "Incidencia" },
  { value: "acadÃƒÂ©mico", label: "Academico" },
  { value: "tutorÃƒÂ­a", label: "Tutoria" },
  { value: "general", label: "General" }
];

const chips = [
  { value: "", label: "Todos" },
  { value: "unread", label: "No leidos" },
  { value: "families", label: "Familias" },
  { value: "teachers", label: "Docentes" },
  { value: "courses", label: "Cursos" },
  { value: "important", label: "Importantes" }
];

export default async function DirectorCommunicationsPage({ searchParams }: DirectorCommunicationsPageProps) {
  const profile = await requireRole("director");
  const [{ communications, errorMessage }, { courses }, { students }, { profiles }] = await Promise.all([
    getDirectorCommunications({
      studentId: searchParams.student_id,
      courseId: searchParams.course_id,
      senderId: searchParams.sender_id,
      receiverId: searchParams.receiver_id,
      category: searchParams.category,
      status: searchParams.status
    }),
    getAdminCourses(),
    getDirectorStudents(),
    getAdminProfiles()
  ]);

  const teachers = profiles.filter((item) => item.role === "tutor");
  const families = profiles.filter((item) => item.role === "family");
  const advancedFiltered = applyDirectorFilters(communications, profile.id, searchParams);
  const conversations = filterConversations(
    buildConversations({ communications: advancedFiltered, directorId: profile.id, profiles }),
    searchParams
  );
  const selectedConversation = searchParams.c
    ? conversations.find((conversation) => conversation.id === searchParams.c) ?? null
    : null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Comunicaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bandeja de conversaciones para responder, reenviar y supervisar toda la comunicacion del centro.
          </p>
        </div>
        <Link
          href="/dashboard/director"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </header>

      <details className="rounded-lg border border-border bg-white p-5">
        <summary className="flex cursor-pointer list-none items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Send className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-semibold text-foreground">Nueva comunicacion</span>
            <span className="mt-1 block text-sm text-muted-foreground">Crear mensaje a familias, docentes o curso.</span>
          </span>
        </summary>
        <DirectorNewCommunicationForm
          action={sendDirectorCommunication}
          teachers={teachers}
          courses={courses}
          students={students}
          categories={categories}
        />
      </details>

      <section className="rounded-lg border border-border bg-white">
        <div className="grid min-h-[680px] lg:grid-cols-[360px_1fr]">
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
            <AdvancedFilters
              courses={courses}
              students={students}
              profiles={profiles}
              searchParams={searchParams}
              directorId={profile.id}
            />

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

          <ConversationDetail
            conversation={selectedConversation}
            directorId={profile.id}
            profiles={[...families, ...teachers]}
          />
        </div>
      </section>
    </section>
  );
}

function SearchAndChips({ searchParams }: { searchParams: DirectorCommunicationsPageProps["searchParams"] }) {
  return (
    <div className="mt-5 space-y-3">
      <form className="flex gap-2">
        <input type="hidden" name="chip" value={searchParams.chip ?? ""} />
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Buscar mensaje, alumno o persona"
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
  searchParams,
  directorId
}: {
  courses: { id: string; name: string }[];
  students: { id: string; name: string; last_name: string; course_id: string }[];
  profiles: AdminProfile[];
  searchParams: DirectorCommunicationsPageProps["searchParams"];
  directorId: string;
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
        <Select name="direction" value={searchParams.direction ?? ""} options={[{ value: "sent", label: "Enviadas por direccion" }, { value: "received", label: "Recibidas por direccion" }, { value: "supervised", label: "Tutor-familia supervisadas" }]} emptyLabel="Todas las direcciones" />
        <Select name="director_only" value={searchParams.director_only ?? ""} options={[{ value: directorId, label: "Solo dirigidas a direccion" }]} emptyLabel="Todas las comunicaciones" />
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
  searchParams: DirectorCommunicationsPageProps["searchParams"];
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
      <div className="mt-3 flex flex-wrap gap-1.5">
        {conversation.tags.slice(0, 4).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </Link>
  );
}

function ConversationDetail({
  conversation,
  directorId,
  profiles
}: {
  conversation: Conversation | null;
  directorId: string;
  profiles: AdminProfile[];
}) {
  if (!conversation) {
    return (
      <main className="flex min-h-[520px] items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <Inbox className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-foreground">Selecciona una conversacion</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aqui veras el hilo ordenado cronologicamente y sus acciones.</p>
        </div>
      </main>
    );
  }

  const messages = [...conversation.messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const latestInbound = [...conversation.messages]
    .reverse()
    .find((message) => message.receiver_id === directorId);
  const latest = conversation.lastMessage;
  const unreadForDirector = conversation.messages
    .filter((message) => message.receiver_id === directorId && !message.read)
    .map((message) => message.id);
  const allIds = conversation.messages.map((message) => message.id);

  return (
    <main className="flex min-h-[680px] flex-col">
      <header className="border-b border-border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{conversation.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{conversation.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {conversation.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
              <Badge>{conversation.isClosed ? "Cerrada" : "Abierta"}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={markDirectorConversationRead}>
              <input type="hidden" name="communication_ids" value={unreadForDirector.join(",")} />
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
                <MailOpen className="h-4 w-4" aria-hidden="true" />
                Marcar leido
              </button>
            </form>
            {conversation.isClosed ? (
              <form action={reopenDirectorConversation}>
                <input type="hidden" name="communication_ids" value={allIds.join(",")} />
                <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
                  Reabrir conversacion
                </button>
              </form>
            ) : (
              <form action={closeDirectorConversation}>
                <input type="hidden" name="communication_ids" value={allIds.join(",")} />
                <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
                  Cerrar conversacion
                </button>
              </form>
            )}
            <form action={markDirectorConversationImportant}>
              <input type="hidden" name="communication_ids" value={allIds.join(",")} />
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
                <Star className="h-4 w-4" aria-hidden="true" />
                Importante
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto bg-background p-5">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} directorId={directorId} />
        ))}
      </div>

      <footer className="space-y-4 border-t border-border p-5">
        {conversation.isClosed ? (
          <p className="rounded-md border border-border bg-white p-3 text-sm text-muted-foreground">
            Conversacion cerrada. Reabrela para responder o reenviar.
          </p>
        ) : latestInbound ? (
          <form action={replyToDirectorCommunication} className="flex flex-col gap-3 md:flex-row">
            <input type="hidden" name="communication_id" value={latestInbound.id} />
            <input
              name="message"
              required
              placeholder="Responder desde direccion"
              className="h-11 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <MessageCircleReply className="h-4 w-4" aria-hidden="true" />
              Responder
            </button>
          </form>
        ) : (
          <p className="rounded-md border border-border bg-white p-3 text-sm text-muted-foreground">
            Conversacion supervisada. Direccion puede reenviar si necesita intervenir, pero no responder como destinataria.
          </p>
        )}

        {conversation.isClosed ? null : (
        <form action={forwardDirectorCommunication} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="communication_id" value={latest.id} />
          <Select
            name="receiver_id"
            value=""
            options={profiles.map((profile) => ({ value: profile.id, label: getProfileDisplayName(profile) }))}
            emptyLabel="Reenviar a familia o docente"
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

function MessageBubble({ message, directorId }: { message: DirectorCommunication; directorId: string }) {
  const fromDirector = message.sender_id === directorId;

  return (
    <article className={`flex ${fromDirector ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-2xl rounded-lg border p-4 ${fromDirector ? "border-primary/30 bg-primary/5" : "border-border bg-white"}`}>
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
        </div>
        <h3 className="mt-3 text-sm font-semibold text-foreground">{message.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{message.message}</p>
      </div>
    </article>
  );
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

function Badge({ children }: { children: string }) {
  return <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium">{children}</span>;
}

function buildConversations({
  communications,
  directorId,
  profiles
}: {
  communications: DirectorCommunication[];
  directorId: string;
  profiles: AdminProfile[];
}) {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const groups = new Map<string, DirectorCommunication[]>();

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
      const participants = Array.from(new Set(messages.flatMap((message) => [message.sender_id, message.receiver_id])));
      const participantProfiles = participants.map((participantId) => profileById.get(participantId)).filter(Boolean) as AdminProfile[];
      const otherNames = participantProfiles
        .filter((participant) => participant.id !== directorId)
        .map((participant) => getProfileDisplayName(participant));
      const hasFamily = participantProfiles.some((participant) => participant.role === "family");
      const hasTeacher = participantProfiles.some((participant) => participant.role === "tutor");
      const isSupervised = !participants.includes(directorId);
      const title =
        lastMessage.studentName !== "Sin alumno"
          ? lastMessage.studentName
          : otherNames.length > 0
            ? otherNames.join(" / ")
            : `${lastMessage.senderName} / ${lastMessage.receiverName}`;
      const tags = Array.from(
        new Set([
          hasFamily ? "familia" : "",
          hasTeacher ? "docente" : "",
          lastMessage.courseName !== "Sin curso" ? "curso" : "",
          getCategoryLabel(lastMessage.category),
          isSupervised ? "supervision" : ""
        ].filter(Boolean))
      );

      return {
        id,
        title: `${title} · ${normalizeSubject(lastMessage.title)}`,
        subtitle: isSupervised ? `${lastMessage.senderName} - ${lastMessage.receiverName}` : otherNames.join(" / "),
        lastMessage,
        messages: sorted,
        unreadCount: messages.filter((message) => !message.read).length,
        tags,
        isImportant: messages.some((message) => message.title.startsWith("[Importante]")),
        isSupervised,
        isClosed: messages.length > 0 && messages.every((message) => message.status === "closed")
      };
    })
    .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
}

function filterConversations(conversations: Conversation[], searchParams: DirectorCommunicationsPageProps["searchParams"]) {
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
      ]
        .join(" ")
        .toLowerCase();

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

function applyDirectorFilters(
  communications: DirectorCommunication[],
  directorId: string,
  searchParams: DirectorCommunicationsPageProps["searchParams"]
) {
  return communications.filter((communication) => {
    if (searchParams.direction === "sent" && communication.sender_id !== directorId) return false;
    if (searchParams.direction === "received" && communication.receiver_id !== directorId) return false;
    if (
      searchParams.direction === "supervised" &&
      (communication.sender_id === directorId || communication.receiver_id === directorId)
    ) {
      return false;
    }
    if (searchParams.director_only && communication.receiver_id !== directorId) return false;

    return true;
  });
}

function hrefWith(searchParams: DirectorCommunicationsPageProps["searchParams"], updates: Record<string, string | undefined>) {
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
  return query ? `/dashboard/director/communications?${query}` : "/dashboard/director/communications";
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
