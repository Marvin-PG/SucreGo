export interface QuizFixture {
  quizId: string;
  placeSlug: string;
  questions: {
    questionId: string;
    prompt: string;
    options: {
      optionId: string;
      text: string;
    }[];
  }[];
}

const optionFixtures = [
  { optionId: "A", text: "[TEXTO DE EJEMPLO]" },
  { optionId: "B", text: "[TEXTO DE EJEMPLO]" },
  { optionId: "C", text: "[TEXTO DE EJEMPLO]" },
];

export const quizFixtures: QuizFixture[] = [
  {
    quizId: "0878e376-fcfe-4aca-9043-f7349f0664eb",
    placeSlug: "plaza-25-de-mayo",
    questions: [
      {
        questionId: "04639bbc-12b6-4115-b8e9-227ad22bd903",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
      {
        questionId: "962fd1de-7c5e-46ae-838a-a724652ea63e",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
      {
        questionId: "e00a232c-4779-4c10-bd4b-974a7402556a",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
    ],
  },
  {
    quizId: "06cab649-0e91-482b-9a14-3eff208f7fbd",
    placeSlug: "casa-de-la-libertad",
    questions: [
      {
        questionId: "8b5a999b-a296-465f-97b0-6c8c9649a029",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
      {
        questionId: "cf34e9d8-6a5a-40c0-aafa-e460f834523e",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
      {
        questionId: "e5baabaf-b40c-41ed-a0e3-1f54f8c5a741",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
    ],
  },
  {
    quizId: "18845dab-3632-4ea6-9ff2-badbe38f90e7",
    placeSlug: "la-recoleta",
    questions: [
      {
        questionId: "fd8044e6-bc52-4383-81e2-999954b2b26c",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
      {
        questionId: "ecff310c-bf84-4bdb-b97e-586ce8bf5aaa",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
      {
        questionId: "c2682ca0-b3ee-4522-a9ef-a33f5eb8cae6",
        prompt: "[TEXTO DE EJEMPLO]",
        options: optionFixtures,
      },
    ],
  },
];
