import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CommunicationLabelClient = ReturnType<typeof createAdminClient>;

export type NotificationCategory = "incidencia" | "acadÃ©mico" | "tutorÃ­a" | "general";

export type FamilyRecipient = {
  parent_id: string;
};

export type FamilyNotification = {
  id: string;
  sender_id: string;
  student_id: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  read_at: string | null;
  status: "open" | "closed";
  created_at: string;
  students: {
    name: string;
    last_name: string;
  } | null;
};

export type FamilyCommunicationFilters = {
  studentId?: string;
  participantId?: string;
  category?: string;
  status?: string;
  direction?: string;
};

export type FamilyCommunication = {
  id: string;
  sender_id: string;
  receiver_id: string;
  student_id: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  read_at: string | null;
  status: "open" | "closed";
  created_at: string;
  direction: "sent" | "received";
  senderName: string;
  receiverName: string;
  studentName: string;
  courseId: string | null;
  courseName: string;
  counterpartName: string;
  counterpartId: string;
};

export type FamilyStudentContact = {
  id: string;
  name: string;
  last_name: string;
  course_id: string;
  tutor_teacher_id: string;
  courseName: string;
  tutorName: string;
};

export type DirectorCommunication = {
  id: string;
  sender_id: string;
  receiver_id: string;
  student_id: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  read_at: string | null;
  status: "open" | "closed";
  created_at: string;
  students: {
    name: string;
    last_name: string;
  } | null;
  senderName: string;
  receiverName: string;
  studentName: string;
  courseId: string | null;
  courseName: string;
};

export type DirectorCommunicationFilters = {
  studentId?: string;
  courseId?: string;
  senderId?: string;
  receiverId?: string;
  category?: string;
  status?: string;
};

export type TutorCommunicationFilters = {
  studentId?: string;
  familyId?: string;
  courseId?: string;
  category?: string;
  status?: string;
  direction?: string;
};

export type TutorCommunication = {
  id: string;
  sender_id: string;
  receiver_id: string;
  student_id: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  read_at: string | null;
  status: "open" | "closed";
  created_at: string;
  direction: "sent" | "received";
  senderName: string;
  receiverName: string;
  studentName: string;
  courseId: string | null;
  courseName: string;
  familyName: string;
  counterpartName: string;
  counterpartId: string;
};

type NotificationRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  student_id: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  read_at: string | null;
  status: "open" | "closed";
  created_at: string;
};

type StudentLabel = {
  id: string;
  name: string;
  last_name: string;
  course_id: string;
};

type FamilyStudentLabel = StudentLabel & {
  tutor_teacher_id: string;
};

type CourseLabel = {
  id: string;
  name: string;
};

type ProfileLabel = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export async function getFamilyRecipientsForStudent(studentId: string): Promise<{
  recipients: FamilyRecipient[];
  errorMessage: string | null;
}> {
  if (!studentId) {
    return { recipients: [], errorMessage: null };
  }

  if (hasSupabaseAdminClient()) {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("parent_students")
      .select("parent_id")
      .eq("student_id", studentId)
      .returns<FamilyRecipient[]>();

    return normalizeFamilyRecipients(data, error?.message ?? null);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_students")
    .select("parent_id")
    .eq("student_id", studentId)
    .returns<FamilyRecipient[]>();

  return normalizeFamilyRecipients(data, error?.message ?? null);
}

function normalizeFamilyRecipients(data: FamilyRecipient[] | null, errorMessage: string | null) {
  if (errorMessage) {
    return {
      recipients: [],
      errorMessage
    };
  }

  const parentIds = Array.from(new Set((data ?? []).map((recipient) => recipient.parent_id).filter(Boolean)));

  return {
    recipients: parentIds.map((parentId) => ({ parent_id: parentId })),
    errorMessage: null
  };
}

export async function getFamilyNotifications(familyId: string): Promise<{
  notifications: FamilyNotification[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,sender_id,student_id,title,message,category,read,read_at,status,created_at,students(name,last_name)")
    .eq("receiver_id", familyId)
    .order("created_at", { ascending: false })
    .returns<FamilyNotification[]>();

  if (error) {
    return {
      notifications: [],
      errorMessage: error.message
    };
  }

  return {
    notifications: data ?? [],
    errorMessage: null
  };
}

export async function getFamilyCommunications(
  familyId: string,
  filters: FamilyCommunicationFilters = {}
): Promise<{
  communications: FamilyCommunication[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select("id,sender_id,receiver_id,student_id,title,message,category,read,read_at,status,created_at")
    .or(`sender_id.eq.${familyId},receiver_id.eq.${familyId}`)
    .order("created_at", { ascending: false });

  if (filters.direction === "sent") {
    query = query.eq("sender_id", familyId);
  }

  if (filters.direction === "received") {
    query = query.eq("receiver_id", familyId);
  }

  if (filters.studentId) {
    query = query.eq("student_id", filters.studentId);
  }

  if (filters.participantId) {
    query = query.or(`sender_id.eq.${filters.participantId},receiver_id.eq.${filters.participantId}`);
  }

  if (isNotificationCategory(filters.category)) {
    query = query.eq("category", filters.category);
  }

  if (filters.status === "read") {
    query = query.eq("read", true);
  }

  if (filters.status === "unread") {
    query = query.eq("read", false);
  }

  const { data, error } = await query.returns<NotificationRow[]>();

  if (error) {
    return { communications: [], errorMessage: error.message };
  }

  return attachFamilyCommunicationLabels(data ?? [], familyId);
}

export async function getFamilyStudentContacts(familyId: string): Promise<{
  students: FamilyStudentContact[];
  directors: ProfileLabel[];
  teachers: ProfileLabel[];
  errorMessage: string | null;
}> {
  const labelClient = await createCommunicationLabelClient();
  const { data: relations, error: relationsError } = await labelClient
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", familyId)
    .returns<{ student_id: string }[]>();

  if (relationsError) {
    return { students: [], directors: [], teachers: [], errorMessage: relationsError.message };
  }

  const studentIds = (relations ?? []).map((relation) => relation.student_id);
  const { data: directors, error: directorsError } = await labelClient
    .from("profiles")
    .select("id,email,full_name")
    .eq("role", "director")
    .eq("active", true)
    .returns<ProfileLabel[]>();
  const { data: teachers, error: teachersError } = await labelClient
    .from("profiles")
    .select("id,email,full_name")
    .eq("role", "tutor")
    .eq("active", true)
    .returns<ProfileLabel[]>();

  if (studentIds.length === 0) {
    return {
      students: [],
      directors: directors ?? [],
      teachers: teachers ?? [],
      errorMessage: directorsError?.message ?? teachersError?.message ?? null
    };
  }

  const { data: students, error: studentsError } = await labelClient
    .from("students")
    .select("id,name,last_name,course_id,tutor_teacher_id")
    .in("id", studentIds)
    .returns<FamilyStudentLabel[]>();

  const firstError = studentsError?.message ?? directorsError?.message ?? teachersError?.message ?? null;

  if (firstError) {
    return { students: [], directors: [], teachers: [], errorMessage: firstError };
  }

  const courseIds = Array.from(new Set((students ?? []).map((student) => student.course_id)));
  const tutorIds = Array.from(new Set((students ?? []).map((student) => student.tutor_teacher_id)));
  const [
    { data: courses, error: coursesError },
    { data: tutors, error: tutorsError }
  ] = await Promise.all([
    courseIds.length > 0
      ? labelClient.from("courses").select("id,name").in("id", courseIds).returns<CourseLabel[]>()
      : Promise.resolve({ data: [] as CourseLabel[], error: null }),
    tutorIds.length > 0
      ? labelClient.from("profiles").select("id,email,full_name").in("id", tutorIds).returns<ProfileLabel[]>()
      : Promise.resolve({ data: [] as ProfileLabel[], error: null })
  ]);

  const labelError = coursesError?.message ?? tutorsError?.message ?? null;

  if (labelError) {
    return { students: [], directors: [], teachers: [], errorMessage: labelError };
  }

  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const tutorsById = new Map((tutors ?? []).map((tutor) => [tutor.id, tutor]));

  return {
    directors: directors ?? [],
    teachers: teachers ?? [],
    errorMessage: null,
    students: (students ?? []).map((student) => {
      const tutor = tutorsById.get(student.tutor_teacher_id);

      return {
        ...student,
        courseName: coursesById.get(student.course_id)?.name ?? "Sin curso",
        tutorName: tutor?.full_name ?? tutor?.email ?? student.tutor_teacher_id
      };
    })
  };
}

export async function getDirectorCommunications(filters: DirectorCommunicationFilters = {}): Promise<{
  communications: DirectorCommunication[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select("id,sender_id,receiver_id,student_id,title,message,category,read,read_at,status,created_at,students(name,last_name)")
    .order("created_at", { ascending: false });

  if (filters.studentId) {
    query = query.eq("student_id", filters.studentId);
  }

  if (filters.senderId) {
    query = query.eq("sender_id", filters.senderId);
  }

  if (filters.receiverId) {
    query = query.eq("receiver_id", filters.receiverId);
  }

  if (isNotificationCategory(filters.category)) {
    query = query.eq("category", filters.category);
  }

  if (filters.status === "read") {
    query = query.eq("read", true);
  }

  if (filters.status === "unread") {
    query = query.eq("read", false);
  }

  const { data, error } = await query.returns<(NotificationRow & { students: { name: string; last_name: string } | null })[]>();

  if (error) {
    return {
      communications: [],
      errorMessage: error.message
    };
  }

  return attachDirectorCommunicationLabels(data ?? [], filters.courseId);
}

export async function getTutorCommunications(
  tutorId: string,
  filters: TutorCommunicationFilters = {}
): Promise<{
  communications: TutorCommunication[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select("id,sender_id,receiver_id,student_id,title,message,category,read,read_at,status,created_at")
    .or(`sender_id.eq.${tutorId},receiver_id.eq.${tutorId}`)
    .order("created_at", { ascending: false });

  if (filters.direction === "sent") {
    query = query.eq("sender_id", tutorId);
  }

  if (filters.direction === "received") {
    query = query.eq("receiver_id", tutorId);
  }

  if (filters.studentId) {
    query = query.eq("student_id", filters.studentId);
  }

  if (filters.familyId) {
    query = query.or(`sender_id.eq.${filters.familyId},receiver_id.eq.${filters.familyId}`);
  }

  if (isNotificationCategory(filters.category)) {
    query = query.eq("category", filters.category);
  }

  if (filters.status === "read") {
    query = query.eq("read", true);
  }

  if (filters.status === "unread") {
    query = query.eq("read", false);
  }

  const { data, error } = await query.returns<NotificationRow[]>();

  if (error) {
    return { communications: [], errorMessage: error.message };
  }

  const notifications = data ?? [];

  if (notifications.length === 0) {
    return { communications: [], errorMessage: null };
  }

  return attachTutorCommunicationLabels(notifications, tutorId, filters.courseId);
}

export async function getTutorUnreadCommunicationsCount(tutorId: string): Promise<{
  count: number;
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", tutorId)
    .eq("read", false);

  if (error) {
    return { count: 0, errorMessage: error.message };
  }

  return { count: count ?? 0, errorMessage: null };
}

async function attachTutorCommunicationLabels(
  notifications: NotificationRow[],
  tutorId: string,
  courseFilterId?: string
): Promise<{
  communications: TutorCommunication[];
  errorMessage: string | null;
}> {
  const labelClient = await createCommunicationLabelClient();
  const studentIds = Array.from(
    new Set(notifications.map((notification) => notification.student_id).filter((id): id is string => Boolean(id)))
  );
  const profileIds = Array.from(
    new Set(notifications.flatMap((notification) => [notification.sender_id, notification.receiver_id]))
  );
  const [
    { data: students, error: studentsError },
    { data: profiles, error: profilesError }
  ] = await Promise.all([
    studentIds.length > 0
      ? labelClient.from("students").select("id,name,last_name,course_id").in("id", studentIds).returns<StudentLabel[]>()
      : Promise.resolve({ data: [] as StudentLabel[], error: null }),
    profileIds.length > 0
      ? labelClient.from("profiles").select("id,email,full_name").in("id", profileIds).returns<ProfileLabel[]>()
      : Promise.resolve({ data: [] as ProfileLabel[], error: null })
  ]);
  const firstError = studentsError?.message ?? profilesError?.message ?? null;

  if (firstError) {
    return { communications: [], errorMessage: firstError };
  }

  const courseIds = Array.from(new Set((students ?? []).map((student) => student.course_id)));
  const { data: courses, error: coursesError } =
    courseIds.length > 0
      ? await labelClient.from("courses").select("id,name").in("id", courseIds).returns<CourseLabel[]>()
      : { data: [] as CourseLabel[], error: null };

  if (coursesError) {
    return { communications: [], errorMessage: coursesError.message };
  }

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const communications = notifications
    .map((notification) => {
      const student = notification.student_id ? studentsById.get(notification.student_id) : null;
      const course = student ? coursesById.get(student.course_id) : null;
      const sender = profilesById.get(notification.sender_id);
      const receiver = profilesById.get(notification.receiver_id);
      const direction: TutorCommunication["direction"] = notification.sender_id === tutorId ? "sent" : "received";
      const counterpartId = direction === "sent" ? notification.receiver_id : notification.sender_id;
      const counterpart = profilesById.get(counterpartId);

      return {
        ...notification,
        direction,
        senderName: sender?.full_name ?? sender?.email ?? notification.sender_id,
        receiverName: receiver?.full_name ?? receiver?.email ?? notification.receiver_id,
        studentName: student ? `${student.name} ${student.last_name}` : notification.student_id ?? "Sin alumno",
        courseId: student?.course_id ?? null,
        courseName: course?.name ?? "Sin curso",
        familyName: counterpart?.full_name ?? counterpart?.email ?? counterpartId,
        counterpartName: counterpart?.full_name ?? counterpart?.email ?? counterpartId,
        counterpartId
      };
    })
    .filter((communication) => !courseFilterId || communication.courseId === courseFilterId);

  return { communications, errorMessage: null };
}

async function attachFamilyCommunicationLabels(
  notifications: NotificationRow[],
  familyId: string
): Promise<{
  communications: FamilyCommunication[];
  errorMessage: string | null;
}> {
  if (notifications.length === 0) {
    return { communications: [], errorMessage: null };
  }

  const labelClient = await createCommunicationLabelClient();
  const studentIds = Array.from(
    new Set(notifications.map((notification) => notification.student_id).filter((id): id is string => Boolean(id)))
  );
  const profileIds = Array.from(
    new Set(notifications.flatMap((notification) => [notification.sender_id, notification.receiver_id]))
  );
  const [
    { data: students, error: studentsError },
    { data: profiles, error: profilesError }
  ] = await Promise.all([
    studentIds.length > 0
      ? labelClient.from("students").select("id,name,last_name,course_id").in("id", studentIds).returns<StudentLabel[]>()
      : Promise.resolve({ data: [] as StudentLabel[], error: null }),
    profileIds.length > 0
      ? labelClient.from("profiles").select("id,email,full_name").in("id", profileIds).returns<ProfileLabel[]>()
      : Promise.resolve({ data: [] as ProfileLabel[], error: null })
  ]);
  const firstError = studentsError?.message ?? profilesError?.message ?? null;

  if (firstError) {
    return { communications: [], errorMessage: firstError };
  }

  const courseIds = Array.from(new Set((students ?? []).map((student) => student.course_id)));
  const { data: courses, error: coursesError } =
    courseIds.length > 0
      ? await labelClient.from("courses").select("id,name").in("id", courseIds).returns<CourseLabel[]>()
      : { data: [] as CourseLabel[], error: null };

  if (coursesError) {
    return { communications: [], errorMessage: coursesError.message };
  }

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const communications = notifications.map((notification) => {
    const student = notification.student_id ? studentsById.get(notification.student_id) : null;
    const sender = profilesById.get(notification.sender_id);
    const receiver = profilesById.get(notification.receiver_id);
    const course = student ? coursesById.get(student.course_id) : null;
    const direction: FamilyCommunication["direction"] = notification.sender_id === familyId ? "sent" : "received";
    const counterpartId = direction === "sent" ? notification.receiver_id : notification.sender_id;
    const counterpart = profilesById.get(counterpartId);

    return {
      ...notification,
      direction,
      senderName: sender?.full_name ?? sender?.email ?? notification.sender_id,
      receiverName: receiver?.full_name ?? receiver?.email ?? notification.receiver_id,
      studentName: student ? `${student.name} ${student.last_name}` : notification.student_id ?? "Sin alumno",
      courseId: student?.course_id ?? null,
      courseName: course?.name ?? "Sin curso",
      counterpartName: counterpart?.full_name ?? counterpart?.email ?? counterpartId,
      counterpartId
    };
  });

  return { communications, errorMessage: null };
}

async function attachDirectorCommunicationLabels(
  notifications: (NotificationRow & { students: { name: string; last_name: string } | null })[],
  courseFilterId?: string
): Promise<{
  communications: DirectorCommunication[];
  errorMessage: string | null;
}> {
  if (notifications.length === 0) {
    return { communications: [], errorMessage: null };
  }

  const labelClient = await createCommunicationLabelClient();
  const profileIds = Array.from(
    new Set(notifications.flatMap((notification) => [notification.sender_id, notification.receiver_id]))
  );
  const studentIds = Array.from(
    new Set(notifications.map((notification) => notification.student_id).filter((id): id is string => Boolean(id)))
  );
  const [
    { data: profiles, error: profilesError },
    { data: students, error: studentsError }
  ] = await Promise.all([
    labelClient.from("profiles").select("id,email,full_name").in("id", profileIds).returns<ProfileLabel[]>(),
    studentIds.length > 0
      ? labelClient.from("students").select("id,name,last_name,course_id").in("id", studentIds).returns<StudentLabel[]>()
      : Promise.resolve({ data: [] as StudentLabel[], error: null })
  ]);
  const firstError = profilesError?.message ?? studentsError?.message ?? null;

  if (firstError) {
    return { communications: [], errorMessage: firstError };
  }

  const courseIds = Array.from(new Set((students ?? []).map((student) => student.course_id)));
  const { data: courses, error: coursesError } =
    courseIds.length > 0
      ? await labelClient.from("courses").select("id,name").in("id", courseIds).returns<CourseLabel[]>()
      : { data: [] as CourseLabel[], error: null };

  if (coursesError) {
    return { communications: [], errorMessage: coursesError.message };
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const communications = notifications
    .map((notification) => {
      const sender = profilesById.get(notification.sender_id);
      const receiver = profilesById.get(notification.receiver_id);
      const student = notification.student_id ? studentsById.get(notification.student_id) : null;
      const course = student ? coursesById.get(student.course_id) : null;

      return {
        ...notification,
        senderName: sender?.full_name ?? sender?.email ?? notification.sender_id,
        receiverName: receiver?.full_name ?? receiver?.email ?? notification.receiver_id,
        studentName: student ? `${student.name} ${student.last_name}` : notification.student_id ?? "Sin alumno",
        courseId: student?.course_id ?? null,
        courseName: course?.name ?? "Sin curso"
      };
    })
    .filter((communication) => !courseFilterId || communication.courseId === courseFilterId);

  return { communications, errorMessage: null };
}

function isNotificationCategory(category: string | undefined): category is NotificationCategory {
  if (category === "acadÃ©mico" || category === "tutorÃ­a") {
    return true;
  }

  return (
    category === "incidencia" ||
    category === "acadÃ©mico" ||
    category === "acadÃƒÂ©mico" ||
    category === "tutorÃ­a" ||
    category === "tutorÃƒÂ­a" ||
    category === "general"
  );
}

async function createCommunicationLabelClient(): Promise<CommunicationLabelClient> {
  if (hasSupabaseAdminClient()) {
    return createAdminClient();
  }

  return (await createClient()) as unknown as CommunicationLabelClient;
}


