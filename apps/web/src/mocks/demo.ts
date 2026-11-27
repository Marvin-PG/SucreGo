import type { Api, Profile } from "../api/contract";
import { placeArt } from "../art";
import { placeFixtures } from "./places";
import { quizFixtures } from "./quizzes";

const date = "2026-11-27T14:00:00.000Z";
const source = {
  title: "UNESCO · Ciudad histórica de Sucre",
  url: "https://whc.unesco.org/en/list/566/",
};
const summaries: Record<string, string> = {
  "casa-de-la-libertad": "Una puerta a la historia de Bolivia.",
  "plaza-25-de-mayo": "Una parada en el corazón de Sucre.",
  "la-recoleta": "Una nueva perspectiva sobre Sucre.",
};
const places = placeFixtures.map((place) => ({
  ...place,
  imageUrl: placeArt[place.slug],
  summary: summaries[place.slug],
  description: `En esta misión de muestra recorrerás ${place.name} y explorarás cómo leer una fuente patrimonial.`,
  sources: [source],
}));

const profile: Profile = {
  userId: "demo",
  alias: "Chaski de muestra",
  totalXp: 0,
  level: "Explorador",
  completedPlaceSlugs: [],
  createdAt: date,
};

function getPlace(slug: string) {
  const place = places.find((item) => item.slug === slug);
  if (!place) throw new Error("Este lugar no está disponible.");
  return place;
}

async function getQuiz(slug: string) {
  const quiz = quizFixtures.find((item) => item.placeSlug === slug);
  if (!quiz) throw new Error("Este desafío no está disponible.");
  const examples = [
    [
      `¿Qué lugar estás explorando?`,
      getPlace(slug).name,
      "Un lugar sin nombre",
      "Una ciudad desconocida",
    ],
    ["¿Qué ciudad estamos recorriendo?", "Sucre", "La Paz", "Cochabamba"],
    [
      "¿Dónde puedes contrastar la información?",
      "En la fuente enlazada",
      "En el color del mapa",
      "En el ranking",
    ],
  ];
  return {
    ...quiz,
    questions: quiz.questions.map((question, index) => ({
      ...question,
      prompt: examples[index][0],
      options: question.options.map((option, optionIndex) => ({
        ...option,
        text: examples[index][1 + ((optionIndex + 3 - index) % 3)],
      })),
    })),
  };
}

export const demoApi: Api = {
  places: async () => ({ items: places, nextCursor: null }),
  place: async (slug) => getPlace(slug),
  lesson: async (slug) => ({
    lessonId: slug,
    placeSlug: slug,
    title: "Antes de empezar…",
    content: `Estás explorando ${getPlace(slug).name}, en Sucre. Abre la ficha de UNESCO para consultar información sobre la ciudad y su patrimonio.\n\nEn este desafío de muestra practicarás cómo orientarte en la app y cómo encontrar una fuente.`,
    sources: [source],
    createdAt: date,
  }),
  chat: async (slug) => ({
    answer: `La guía conectada se requiere para responder preguntas sobre ${getPlace(slug).name}. Puedes consultar la fuente de la lección.`,
    citations: [],
    abstained: true,
    createdAt: date,
  }),
  quiz: getQuiz,
  submit: async (slug, submission) => {
    const quiz = await getQuiz(slug);
    const correctCount = quiz.questions.filter((question, index) =>
      submission.answers.some(
        (answer) =>
          answer.questionId === question.questionId &&
          answer.optionId === question.options[index].optionId,
      ),
    ).length;
    const passed = correctCount >= 2;
    const firstCompletion = passed && !profile.completedPlaceSlugs.includes(slug);
    if (firstCompletion) profile.completedPlaceSlugs.push(slug);
    return {
      correctCount,
      totalQuestions: 3,
      passed,
      firstCompletion,
      xpAwarded: 0,
      totalXp: 0,
      level: profile.level,
    };
  },
  me: async () => ({ ...profile, completedPlaceSlugs: [...profile.completedPlaceSlugs] }),
  leaderboard: async () => ({
    items: [
      { rank: 1, userId: "demo-1", alias: "Ruta Andina", totalXp: 700, level: "Investigador" },
      { rank: 2, userId: "demo-2", alias: "Viajera de Sucre", totalXp: 500, level: "Investigador" },
      { rank: 3, userId: "demo-3", alias: "Mapa del Sur", totalXp: 400, level: "Investigador" },
      { rank: 4, userId: "demo-4", alias: "Callejón", totalXp: 300, level: "Explorador" },
    ],
    generatedAt: date,
  }),
};
