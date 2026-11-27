import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { SupabaseAuthClient } from "../src/config/supabase.js";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import type { ProfileRepository, ProfileRow } from "../src/modules/profile/profile.repository.js";
import type {
  CreateAttemptInput,
  EvaluationQuestionRow,
  QuizRepository,
} from "../src/modules/quiz/quiz.repository.js";
import { deriveQuizId } from "../src/modules/quiz/quiz.service.js";

const USER_ID = "2fa53087-367f-4dcf-92e1-01c6979ca813";
const PLACE_SLUG = "plaza-25-de-mayo";

const Q1_ID = "04639bbc-12b6-4115-b8e9-227ad22bd903";
const Q2_ID = "962fd1de-7c5e-46ae-838a-a724652ea63e";
const Q3_ID = "e00a232c-4779-4c10-bd4b-974a7402556a";

const SAMPLE_QUESTIONS: EvaluationQuestionRow[] = [
  {
    id: Q1_ID,
    place_slug: PLACE_SLUG,
    position: 1,
    prompt: "Pregunta 1",
    options: [
      { optionId: "A", text: "Opción A1" },
      { optionId: "B", text: "Opción B1" },
      { optionId: "C", text: "Opción C1" },
    ],
    correct_index: 0,
    explanation: "Explicación secreta 1",
  },
  {
    id: Q2_ID,
    place_slug: PLACE_SLUG,
    position: 2,
    prompt: "Pregunta 2",
    options: [
      { optionId: "A", text: "Opción A2" },
      { optionId: "B", text: "Opción B2" },
      { optionId: "C", text: "Opción C2" },
    ],
    correct_index: 1,
    explanation: "Explicación secreta 2",
  },
  {
    id: Q3_ID,
    place_slug: PLACE_SLUG,
    position: 3,
    prompt: "Pregunta 3",
    options: [
      { optionId: "A", text: "Opción A3" },
      { optionId: "B", text: "Opción B3" },
      { optionId: "C", text: "Opción C3" },
    ],
    correct_index: 2,
    explanation: "Explicación secreta 3",
  },
];

function createQuizTestHarness() {
  const profiles = new Map<string, ProfileRow>();
  const attempts: CreateAttemptInput[] = [];
  const completions = new Map<string, number>();

  const authClient: SupabaseAuthClient = {
    getUser: vi.fn(async (token: string) => {
      if (token === "valid-token") {
        return { data: { user: { id: USER_ID } }, error: null };
      }

      return { data: { user: null }, error: { message: "Invalid token", status: 401 } };
    }),
  };

  const profileRepository: ProfileRepository = {
    findProfileById: vi.fn(async (userId) => profiles.get(userId) ?? null),
    createProfile: vi.fn(async (userId, alias) => {
      const row: ProfileRow = { id: userId, alias, created_at: "2026-11-27T14:00:00.000Z" };
      profiles.set(userId, row);
      return { profile: row, conflict: false };
    }),
    listUserCompletions: vi.fn(async () => []),
    listLeaderboard: vi.fn(async () => []),
  };

  const quizRepository: QuizRepository = {
    placeExists: vi.fn(async (slug) => slug === PLACE_SLUG),
    findPublicQuestionsByPlace: vi.fn(async (slug) =>
      slug === PLACE_SLUG
        ? SAMPLE_QUESTIONS.map(({ id, place_slug, position, prompt, options }) => ({
            id,
            place_slug,
            position,
            prompt,
            options,
          }))
        : [],
    ),
    findEvaluationQuestionsByPlace: vi.fn(async (slug) =>
      slug === PLACE_SLUG ? SAMPLE_QUESTIONS : [],
    ),
    createAttempt: vi.fn(async (input) => {
      if (!profiles.has(input.userId)) {
        throw new Error("Foreign key violation: profile must exist before attempt");
      }

      attempts.push(input);
    }),
    recordFirstMissionCompletion: vi.fn(async ({ userId, placeSlug, xpAwarded }) => {
      if (!profiles.has(userId)) {
        throw new Error("Foreign key violation: profile must exist before completion");
      }

      const key = `${userId}:${placeSlug}`;

      if (completions.has(key)) {
        return { inserted: false };
      }

      completions.set(key, xpAwarded);
      return { inserted: true };
    }),
    getUserTotalXp: vi.fn(async (userId) => {
      let total = 0;

      for (const [key, xp] of completions.entries()) {
        if (key.startsWith(`${userId}:`)) {
          total += xp;
        }
      }

      return total;
    }),
  };

  const app = createApp({
    auth: createAuthMiddleware(() => authClient),
    profileRepository,
    quizRepository,
    generateAlias: () => "Explorador-TEST",
  });

  return { app, attempts, completions, profiles, profileRepository, quizRepository };
}

describe("GET /api/places/:id/quiz", () => {
  it("requires authentication", async () => {
    const { app } = createQuizTestHarness();

    const response = await request(app).get(`/api/places/${PLACE_SLUG}/quiz`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 3 questions and options without ever exposing correct_index or answers", async () => {
    const { app } = createQuizTestHarness();

    const response = await request(app)
      .get(`/api/places/${PLACE_SLUG}/quiz`)
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      quizId: deriveQuizId(PLACE_SLUG),
      placeSlug: PLACE_SLUG,
      questions: [
        {
          questionId: Q1_ID,
          prompt: "Pregunta 1",
          options: [
            { optionId: "A", text: "Opción A1" },
            { optionId: "B", text: "Opción B1" },
            { optionId: "C", text: "Opción C1" },
          ],
        },
        {
          questionId: Q2_ID,
          prompt: "Pregunta 2",
          options: [
            { optionId: "A", text: "Opción A2" },
            { optionId: "B", text: "Opción B2" },
            { optionId: "C", text: "Opción C2" },
          ],
        },
        {
          questionId: Q3_ID,
          prompt: "Pregunta 3",
          options: [
            { optionId: "A", text: "Opción A3" },
            { optionId: "B", text: "Opción B3" },
            { optionId: "C", text: "Opción C3" },
          ],
        },
      ],
    });

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("correct_index");
    expect(serialized).not.toContain("correctIndex");
    expect(serialized).not.toContain("explanation");
  });

  it("returns 404 when the place does not exist", async () => {
    const { app } = createQuizTestHarness();

    const response = await request(app)
      .get("/api/places/lugar-inexistente/quiz")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/places/:id/quiz/submit", () => {
  it("awards 100 XP on first pass (2/3) and ensures profile exists before writes", async () => {
    const { app, attempts, profiles } = createQuizTestHarness();
    const quizId = deriveQuizId(PLACE_SLUG);

    const response = await request(app)
      .post(`/api/places/${PLACE_SLUG}/quiz/submit`)
      .set("Authorization", "Bearer valid-token")
      .send({
        quizId,
        answers: [
          { questionId: Q1_ID, optionId: "A" }, // correct
          { questionId: Q2_ID, optionId: "B" }, // correct
          { questionId: Q3_ID, optionId: "A" }, // wrong
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      correctCount: 2,
      totalQuestions: 3,
      passed: true,
      xpAwarded: 100,
      totalXp: 100,
      level: "Investigador",
      firstCompletion: true,
    });
    expect(profiles.has(USER_ID)).toBe(true);
    expect(attempts).toEqual([{ userId: USER_ID, placeSlug: PLACE_SLUG, score: 2, passed: true }]);
  });

  it("awards 0 XP when failing (< 2/3) while still recording the attempt", async () => {
    const { app, attempts, completions } = createQuizTestHarness();
    const quizId = deriveQuizId(PLACE_SLUG);

    const response = await request(app)
      .post(`/api/places/${PLACE_SLUG}/quiz/submit`)
      .set("Authorization", "Bearer valid-token")
      .send({
        quizId,
        answers: [
          { questionId: Q1_ID, optionId: "A" }, // correct
          { questionId: Q2_ID, optionId: "A" }, // wrong
          { questionId: Q3_ID, optionId: "A" }, // wrong
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      correctCount: 1,
      totalQuestions: 3,
      passed: false,
      xpAwarded: 0,
      totalXp: 0,
      level: "Explorador",
      firstCompletion: false,
    });
    expect(attempts).toHaveLength(1);
    expect(completions.size).toBe(0);
  });

  it("never duplicates XP on retry after passing (strictly idempotent)", async () => {
    const { app, attempts } = createQuizTestHarness();
    const quizId = deriveQuizId(PLACE_SLUG);

    const first = await request(app)
      .post(`/api/places/${PLACE_SLUG}/quiz/submit`)
      .set("Authorization", "Bearer valid-token")
      .send({
        quizId,
        answers: [
          { questionId: Q1_ID, optionId: "A" },
          { questionId: Q2_ID, optionId: "B" },
          { questionId: Q3_ID, optionId: "A" },
        ],
      });

    expect(first.status).toBe(200);
    expect(first.body.xpAwarded).toBe(100);
    expect(first.body.firstCompletion).toBe(true);
    expect(first.body.totalXp).toBe(100);

    const retry = await request(app)
      .post(`/api/places/${PLACE_SLUG}/quiz/submit`)
      .set("Authorization", "Bearer valid-token")
      .send({
        quizId,
        answers: [
          { questionId: Q1_ID, optionId: "A" },
          { questionId: Q2_ID, optionId: "B" },
          { questionId: Q3_ID, optionId: "C" },
        ],
      });

    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({
      correctCount: 3,
      totalQuestions: 3,
      passed: true,
      xpAwarded: 0,
      totalXp: 100,
      level: "Investigador",
      firstCompletion: false,
    });
    expect(attempts).toHaveLength(2);
  });

  it("rejects invalid payloads, wrong quizId, and invalid options with 400 VALIDATION_ERROR", async () => {
    const { app } = createQuizTestHarness();
    const quizId = deriveQuizId(PLACE_SLUG);

    const wrongQuizId = await request(app)
      .post(`/api/places/${PLACE_SLUG}/quiz/submit`)
      .set("Authorization", "Bearer valid-token")
      .send({
        quizId: "11111111-1111-4111-8111-111111111111",
        answers: [
          { questionId: Q1_ID, optionId: "A" },
          { questionId: Q2_ID, optionId: "B" },
          { questionId: Q3_ID, optionId: "C" },
        ],
      });
    expect(wrongQuizId.status).toBe(400);
    expect(wrongQuizId.body.error.code).toBe("VALIDATION_ERROR");

    const invalidOption = await request(app)
      .post(`/api/places/${PLACE_SLUG}/quiz/submit`)
      .set("Authorization", "Bearer valid-token")
      .send({
        quizId,
        answers: [
          { questionId: Q1_ID, optionId: "Z" },
          { questionId: Q2_ID, optionId: "B" },
          { questionId: Q3_ID, optionId: "C" },
        ],
      });
    expect(invalidOption.status).toBe(400);
    expect(invalidOption.body.error.code).toBe("VALIDATION_ERROR");

    const incompleteAnswers = await request(app)
      .post(`/api/places/${PLACE_SLUG}/quiz/submit`)
      .set("Authorization", "Bearer valid-token")
      .send({
        quizId,
        answers: [{ questionId: Q1_ID, optionId: "A" }],
      });
    expect(incompleteAnswers.status).toBe(400);
    expect(incompleteAnswers.body.error.code).toBe("VALIDATION_ERROR");
  });
});
