import crypto from "node:crypto";
import { z } from "zod";
import { ApiError } from "../../shared/errors.js";
import { calculateLevel } from "../../shared/levels.js";
import type { UserLevel } from "../../shared/levels.js";
import { parsePlaceSlug, uuidSchema } from "../../shared/validation.js";
import type { ProfileRecord } from "../profile/profile.service.js";
import { SupabaseQuizRepository } from "./quiz.repository.js";
import type { QuizRepository } from "./quiz.repository.js";

export const PASSING_SCORE = 2;
export const MISSION_XP = 100;

export interface QuizOption {
  optionId: string;
  text: string;
}

export interface PublicQuizQuestion {
  questionId: string;
  prompt: string;
  options: QuizOption[];
}

export interface QuizResponse {
  quizId: string;
  placeSlug: string;
  questions: PublicQuizQuestion[];
}

export interface QuizSubmitResponse {
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  xpAwarded: number;
  totalXp: number;
  level: UserLevel;
  firstCompletion: boolean;
}

const structuredOptionsSchema = z
  .array(
    z.object({
      optionId: z.string().trim().min(1),
      text: z.string().trim().min(1),
    }),
  )
  .min(2);

const plainStringOptionsSchema = z.array(z.string().trim().min(1)).min(2);

const submitQuizBodySchema = z
  .object({
    quizId: uuidSchema,
    answers: z
      .array(
        z
          .object({
            questionId: uuidSchema,
            optionId: z.string().trim().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export function deriveQuizId(placeSlug: string): string {
  const hash = crypto.createHash("sha256").update(`sucrego:quiz:${placeSlug}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function normalizeOptions(rawOptions: unknown): QuizOption[] {
  const structured = structuredOptionsSchema.safeParse(rawOptions);

  if (structured.success) {
    return structured.data.map(({ optionId, text }) => ({ optionId, text }));
  }

  const plain = plainStringOptionsSchema.safeParse(rawOptions);

  if (plain.success) {
    return plain.data.map((text, index) => ({
      optionId: String.fromCharCode(65 + index),
      text,
    }));
  }

  throw new ApiError("INTERNAL_ERROR", "El formato de opciones del desafío es inválido.");
}

export interface QuizServiceDependencies {
  repository?: QuizRepository;
  ensureProfile: (userId: string) => Promise<ProfileRecord>;
}

export class QuizService {
  private readonly repository: QuizRepository;
  private readonly ensureProfile: (userId: string) => Promise<ProfileRecord>;

  constructor(dependencies: QuizServiceDependencies) {
    this.repository = dependencies.repository ?? new SupabaseQuizRepository();
    this.ensureProfile = dependencies.ensureProfile;
  }

  async getQuiz(rawSlug: unknown): Promise<QuizResponse> {
    const placeSlug = parsePlaceSlug(rawSlug);
    const exists = await this.repository.placeExists(placeSlug);

    if (!exists) {
      throw new ApiError("NOT_FOUND", "No se encontró el lugar solicitado.");
    }

    const questions = await this.repository.findPublicQuestionsByPlace(placeSlug);

    if (questions.length === 0) {
      throw new ApiError("NOT_FOUND", "No hay un desafío disponible para este lugar.");
    }

    return {
      quizId: deriveQuizId(placeSlug),
      placeSlug,
      questions: questions.map((question) => ({
        questionId: question.id,
        prompt: question.prompt,
        options: normalizeOptions(question.options),
      })),
    };
  }

  async submitQuiz(
    rawSlug: unknown,
    userId: string,
    rawPayload: unknown,
  ): Promise<QuizSubmitResponse> {
    const placeSlug = parsePlaceSlug(rawSlug);
    const parsedPayload = submitQuizBodySchema.safeParse(rawPayload);

    if (!parsedPayload.success) {
      const firstPath = parsedPayload.error.issues[0]?.path.join(".");
      throw new ApiError(
        "VALIDATION_ERROR",
        "Las respuestas del desafío no son válidas.",
        firstPath ? { field: firstPath } : undefined,
      );
    }

    const exists = await this.repository.placeExists(placeSlug);

    if (!exists) {
      throw new ApiError("NOT_FOUND", "No se encontró el lugar solicitado.");
    }

    const questions = await this.repository.findEvaluationQuestionsByPlace(placeSlug);

    if (questions.length === 0) {
      throw new ApiError("NOT_FOUND", "No hay un desafío disponible para este lugar.");
    }

    const expectedQuizId = deriveQuizId(placeSlug);

    if (parsedPayload.data.quizId !== expectedQuizId) {
      throw new ApiError("VALIDATION_ERROR", "El identificador del quiz no corresponde al lugar.", {
        field: "quizId",
      });
    }

    const { answers } = parsedPayload.data;

    if (answers.length !== questions.length) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `Debes responder exactamente ${questions.length} preguntas.`,
        { field: "answers" },
      );
    }

    const answersByQuestionId = new Map<string, string>();

    for (const answer of answers) {
      if (answersByQuestionId.has(answer.questionId)) {
        throw new ApiError("VALIDATION_ERROR", "Hay preguntas duplicadas en el envío.", {
          field: "answers",
        });
      }

      answersByQuestionId.set(answer.questionId, answer.optionId);
    }

    let correctCount = 0;

    for (const question of questions) {
      const submittedOptionId = answersByQuestionId.get(question.id);

      if (!submittedOptionId) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Las preguntas enviadas no corresponden al desafío de este lugar.",
          { field: "answers" },
        );
      }

      const options = normalizeOptions(question.options);
      const selectedIndex = options.findIndex((option) => option.optionId === submittedOptionId);

      if (selectedIndex === -1) {
        throw new ApiError("VALIDATION_ERROR", "Una de las opciones seleccionadas no es válida.", {
          field: "answers",
        });
      }

      if (selectedIndex === question.correct_index) {
        correctCount += 1;
      }
    }

    const totalQuestions = questions.length;
    const passed = correctCount >= PASSING_SCORE;

    await this.ensureProfile(userId);
    await this.repository.createAttempt({
      userId,
      placeSlug,
      score: correctCount,
      passed,
    });

    let firstCompletion = false;
    let xpAwarded = 0;

    if (passed) {
      const completion = await this.repository.recordFirstMissionCompletion({
        userId,
        placeSlug,
        xpAwarded: MISSION_XP,
      });

      if (completion.inserted) {
        firstCompletion = true;
        xpAwarded = MISSION_XP;
      }
    }

    const totalXp = await this.repository.getUserTotalXp(userId);

    return {
      correctCount,
      totalQuestions,
      passed,
      xpAwarded,
      totalXp,
      level: calculateLevel(totalXp),
      firstCompletion,
    };
  }
}
