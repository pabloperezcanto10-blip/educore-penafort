import type { ExperienceRole } from "@/components/experience/experience-data";

export type ExperienceGuideAction = {
  label: string;
  href: string;
  description: string;
};

export type ExperienceGuideFaq = {
  question: string;
  answer: string;
};

export type ExperienceGuideContent = {
  role: ExperienceRole;
  title: string;
  message: string;
  explanation: string;
  highlights: string[];
  actions: ExperienceGuideAction[];
  faqs: ExperienceGuideFaq[];
  closing: string;
};

const sharedFaqs: ExperienceGuideFaq[] = [
  {
    question: "¿Estos datos son reales?",
    answer: "No. EducaCora Experience utiliza datos ficticios y acciones simuladas para que puedas explorar la plataforma sin acceder a ningún centro real."
  },
  {
    question: "¿Se guardan mis cambios?",
    answer: "Los cambios se conservan solo durante esta sesión del navegador. Puedes restablecer la Experience en cualquier momento."
  },
  {
    question: "¿Corium modifica datos reales?",
    answer: "No. En Experience, Corium funciona como guía contextual con respuestas predefinidas y no llama a proveedores externos ni escribe en producción."
  },
  {
    question: "¿Puedo cambiar de perfil?",
    answer: "Sí. Usa “Explorar otro perfil” para cambiar entre Dirección, Docente y Familia sin salir de la Experience."
  },
  {
    question: "¿Cómo puedo contactar?",
    answer: "El canal comercial se conectará en una fase posterior. Por ahora puedes usar “Estoy interesado” para ver el flujo previsto."
  }
];

export const experienceGuideContent: Record<ExperienceRole, ExperienceGuideContent> = {
  director: {
    role: "director",
    title: "Guía de Dirección",
    message: "Estás viendo el centro de control del colegio.",
    explanation: "Aquí Dirección supervisa prioridades, comunicaciones, incidencias, evaluación, calendario y actividad general del centro.",
    highlights: [
      "Centro de supervisión con prioridades reales de gestión.",
      "Actividad del centro organizada como timeline.",
      "Accesos a comunicaciones, alumnado, evaluación y calendario.",
      "Indicadores para saber dónde intervenir primero."
    ],
    actions: [
      {
        label: "Revisar prioridades",
        href: "/experience/director?work_tab=prioridades&demo=prioridades",
        description: "Marca una prioridad ficticia como revisada."
      },
      {
        label: "Abrir comunicaciones",
        href: "/experience/director?work_tab=comunicaciones&demo=communications",
        description: "Consulta conversaciones demo del centro."
      },
      {
        label: "Consultar calendario",
        href: "/experience/director?work_tab=calendario&demo=calendar",
        description: "Revisa eventos ficticios de coordinación."
      }
    ],
    faqs: [
      {
        question: "¿Qué ve Dirección?",
        answer: "Una visión global del colegio: prioridades, comunicaciones, actividad, evaluación, incidencias, alumnado y calendario."
      },
      ...sharedFaqs
    ],
    closing: "Ya has visto cómo EducaCora ayuda a supervisar la actividad, las prioridades y la organización del centro."
  },
  docente: {
    role: "docente",
    title: "Guía del Docente",
    message: "Estás viendo el centro de trabajo diario del docente.",
    explanation: "Este panel ayuda a organizar la jornada: horario, pasar lista, cuaderno, alumnado, comunicaciones, evaluaciones y calendario.",
    highlights: [
      "Horario de hoy con acceso rápido a pasar lista.",
      "Centro de trabajo con pendientes y módulos clave.",
      "Cuaderno, alumnado y comunicaciones en un mismo flujo.",
      "Actividad reciente para entender qué ha ocurrido."
    ],
    actions: [
      {
        label: "Pasar lista",
        href: "/experience/docente?work_tab=pendientes&demo=attendance",
        description: "Marca asistencia ficticia en una clase demo."
      },
      {
        label: "Abrir cuaderno",
        href: "/experience/docente?work_tab=cuaderno&demo=gradebook",
        description: "Consulta el resumen académico demo."
      },
      {
        label: "Revisar alumnado",
        href: "/experience/docente?work_tab=alumnos&demo=students",
        description: "Abre fichas demo de alumnos ficticios."
      }
    ],
    faqs: [
      {
        question: "¿Qué puede probar un docente?",
        answer: "Puede simular pasar lista, consultar el cuaderno, revisar alumnado, leer comunicaciones y abrir eventos del calendario."
      },
      ...sharedFaqs
    ],
    closing: "Ya has visto cómo EducaCora ayuda a organizar el aula, evaluar, pasar lista y comunicarse con las familias."
  },
  familia: {
    role: "familia",
    title: "Guía de Familia",
    message: "Estás viendo el portal familiar de EducaCora.",
    explanation: "La familia consulta comunicaciones, calificaciones visibles, asistencia, justificaciones, calendario y seguimiento del alumno.",
    highlights: [
      "Resumen familiar claro y sin datos privados internos.",
      "Calificaciones visibles según publicación.",
      "Asistencia y justificaciones simuladas.",
      "Comunicaciones y calendario del centro."
    ],
    actions: [
      {
        label: "Ver calificaciones",
        href: "/experience/familia?demo=grades",
        description: "Consulta notas visibles ficticias."
      },
      {
        label: "Revisar asistencia",
        href: "/experience/familia?demo=attendance",
        description: "Simula una justificación familiar."
      },
      {
        label: "Leer comunicaciones",
        href: "/experience/familia?demo=communications",
        description: "Marca una comunicación como leída."
      }
    ],
    faqs: [
      {
        question: "¿Qué ve una familia?",
        answer: "Solo información visible para la familia: comunicaciones, notas publicadas, asistencia, calendario y seguimiento general."
      },
      ...sharedFaqs
    ],
    closing: "Ya has visto cómo EducaCora conecta a las familias con la evolución académica y la vida del centro."
  }
};

export const experienceWelcomeGuide = {
  title: "Hola, soy Corium AI, el corazón inteligente de EducaCora.",
  message: "Puedo acompañarte para que descubras la plataforma desde la perspectiva que más te interese.",
  question: "¿Qué papel desempeñas en tu centro educativo?"
};
