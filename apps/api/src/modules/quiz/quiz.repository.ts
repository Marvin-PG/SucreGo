import { getSupabaseClient } from "../../config/supabase.js";
import type { SupabaseClient, SupabaseError } from "../../config/supabase.js";
import { ApiError } from "../../shared/errors.js";

export interface PublicQuestionRow {
  id: string;
  place_slug: string;
  position: number;
  prompt: string;
  options: unknown;
}

export interface EvaluationQuestionRow extends PublicQuestionRow {
  correct_index: number;
  explanation: string;
}

export interface CreateAttemptInput {
  userId: string;
  placeSlug: string;
  score: number;
  passed: boolean;
}

export interface RecordCompletionInput {
  userId: string;
  placeSlug: string;
  xpAwarded: number;
}

interface PlaceSlugRow {
  slug: string;
}

interface XpRow {
  xp_awarded: number;
}

interface MissionCompletionRow {
  user_id: string;
  place_slug: string;
  xp_awarded: number;
  completed_at: string;
}

export interface QuizRepository {
  placeExists(placeSlug: string): Promise<boolean>;
  findPublicQuestionsByPlace(placeSlug: string): Promise<PublicQuestionRow[]>;
  findEvaluationQuestionsByPlace(placeSlug: string): Promise<EvaluationQuestionRow[]>;
  createAttempt(input: CreateAttemptInput): Promise<void>;
  recordFirstMissionCompletion(input: RecordCompletionInput): Promise<{ inserted: boolean }>;
  getUserTotalXp(userId: string): Promise<number>;
}

function mapSupabaseError(error: SupabaseError, fallbackMessage: string): ApiError {
  if (error.isNetworkError || (error.status !== undefined && error.status >= 500)) {
    return new ApiError(
      "SERVICE_UNAVAILABLE",
      "La base de datos no está disponible temporalmente.",
    );
  }

  return new ApiError("INTERNAL_ERROR", fallbackMessage);
}

export class SupabaseQuizRepository implements QuizRepository {
  constructor(private readonly getClient: () => SupabaseClient = getSupabaseClient) {}

  async placeExists(placeSlug: string): Promise<boolean> {
    const { data, error } = await this.getClient().rest.select<PlaceSlugRow>("places", {
      select: "slug",
      slug: `eq.${placeSlug}`,
      limit: 1,
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudo verificar el lugar solicitado.");
    }

    return (data?.length ?? 0) > 0;
  }

  async findPublicQuestionsByPlace(placeSlug: string): Promise<PublicQuestionRow[]> {
    const { data, error } = await this.getClient().rest.select<PublicQuestionRow>("questions", {
      select: "id,place_slug,position,prompt,options",
      place_slug: `eq.${placeSlug}`,
      order: "position.asc",
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudieron obtener las preguntas del desafío.");
    }

    return data ?? [];
  }

  async findEvaluationQuestionsByPlace(placeSlug: string): Promise<EvaluationQuestionRow[]> {
    const { data, error } = await this.getClient().rest.select<EvaluationQuestionRow>("questions", {
      select: "id,place_slug,position,prompt,options,correct_index,explanation",
      place_slug: `eq.${placeSlug}`,
      order: "position.asc",
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudieron cargar las preguntas para evaluar el desafío.");
    }

    return data ?? [];
  }

  async createAttempt(input: CreateAttemptInput): Promise<void> {
    const { error } = await this.getClient().rest.insert("attempts", {
      user_id: input.userId,
      place_slug: input.placeSlug,
      score: input.score,
      passed: input.passed,
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudo registrar el intento del desafío.");
    }
  }

  async recordFirstMissionCompletion(input: RecordCompletionInput): Promise<{ inserted: boolean }> {
    const { data, error } = await this.getClient().rest.insert<MissionCompletionRow>(
      "mission_completions",
      {
        user_id: input.userId,
        place_slug: input.placeSlug,
        xp_awarded: input.xpAwarded,
      },
      {
        onConflict: "user_id,place_slug",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      if (error.code === "23505" || error.status === 409) {
        return { inserted: false };
      }

      throw mapSupabaseError(error, "No se pudo registrar la finalización de la misión.");
    }

    return { inserted: (data?.length ?? 0) > 0 };
  }

  async getUserTotalXp(userId: string): Promise<number> {
    const { data, error } = await this.getClient().rest.select<XpRow>("mission_completions", {
      select: "xp_awarded",
      user_id: `eq.${userId}`,
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudo calcular el XP total del usuario.");
    }

    return (data ?? []).reduce((sum, row) => sum + row.xp_awarded, 0);
  }
}
