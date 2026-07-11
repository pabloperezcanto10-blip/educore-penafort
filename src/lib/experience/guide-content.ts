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
    question: "¿Cómo funciona EducaCora?",
    answer: "EducaCora conecta dirección, docentes, familias y administración en un único entorno: comunicaciones, asistencia, evaluación, boletines, calendario y seguimiento del alumnado trabajan sobre la misma experiencia."
  },
  {
    question: "¿Qué funciones tiene EducaCora?",
    answer: "La plataforma reúne centro de control, comunicación, cuaderno de calificaciones, asistencia, boletines, gestión de alumnado, calendario, mantenimiento administrativo y la guía de Corium."
  },
  {
    question: "¿Puedo instalar EducaCora?",
    answer: "Sí. EducaCora está preparada como aplicación instalable: puede abrirse desde móvil, tablet u ordenador con una pantalla sencilla para seleccionar el centro educativo."
  },
  {
    question: "¿Qué diferencia hay entre Dirección, Docente y Familia?",
    answer: "Dirección supervisa el centro, el docente trabaja su día a día y las familias consultan la información publicada o visible para ellas. Cada perfil ve lo necesario según permisos."
  },
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

export function findExperienceGuideAnswer(content: ExperienceGuideContent, question: string) {
  const normalizedQuestion = normalizeGuideText(question);

  if (!normalizedQuestion) {
    return null;
  }

  const faqs = content.faqs;
  const directAnswer = faqs.find((faq) => {
    const haystack = normalizeGuideText(`${faq.question} ${faq.answer}`);
    return haystack.includes(normalizedQuestion) || normalizedQuestion.includes(normalizeGuideText(faq.question));
  });

  if (directAnswer) {
    return directAnswer.answer;
  }

  const tokens = normalizedQuestion.split(" ").filter((token) => token.length > 3);
  const scoredFaqs = faqs
    .map((faq) => {
      const haystack = normalizeGuideText(`${faq.question} ${faq.answer}`);
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { faq, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredFaqs[0]?.score) {
    return scoredFaqs[0].faq.answer;
  }

  const keywordAnswer = findGuideKeywordAnswer(faqs, normalizedQuestion);
  return keywordAnswer?.answer ?? null;
}

function findGuideKeywordAnswer(faqs: ExperienceGuideFaq[], question: string) {
  const keywordGroups = [
    ["dato", "real", "ficticio"],
    ["guardar", "cambio", "restablecer"],
    ["corium", "ia", "proveedor"],
    ["perfil", "rol", "direccion", "docente", "familia"],
    ["contact", "reunion", "interesado"],
    ["funcion", "modulo", "hacer"],
    ["instal", "pwa", "movil", "tablet"]
  ];

  const matchingGroup = keywordGroups.find((group) => group.some((keyword) => question.includes(keyword)));

  if (!matchingGroup) {
    return null;
  }

  return faqs.find((faq) => {
    const haystack = normalizeGuideText(`${faq.question} ${faq.answer}`);
    return matchingGroup.some((keyword) => haystack.includes(keyword));
  });
}

function normalizeGuideText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
