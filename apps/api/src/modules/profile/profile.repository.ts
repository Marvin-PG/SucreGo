import { getSupabaseClient } from "../../config/supabase.js";
import type { SupabaseClient, SupabaseError } from "../../config/supabase.js";
import { ApiError } from "../../shared/errors.js";

export interface ProfileRow {
  id: string;
  alias: string;
  created_at: string;
}

export interface MissionCompletionRow {
  user_id: string;
  place_slug: string;
  xp_awarded: number;
  completed_at: string;
}

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  alias: string;
  total_xp: number;
}

export interface ProfileRepository {
  findProfileById(userId: string): Promise<ProfileRow | null>;
  createProfile(
    userId: string,
    alias: string,
  ): Promise<{ profile: ProfileRow | null; conflict: boolean }>;
  listUserCompletions(userId: string): Promise<MissionCompletionRow[]>;
  listLeaderboard(limit?: number): Promise<LeaderboardRow[]>;
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

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly getClient: () => SupabaseClient = getSupabaseClient) {}

  async findProfileById(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.getClient().rest.select<ProfileRow>("profiles", {
      select: "id,alias,created_at",
      id: `eq.${userId}`,
      limit: 1,
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudo consultar el perfil del usuario.");
    }

    return data?.[0] ?? null;
  }

  async createProfile(
    userId: string,
    alias: string,
  ): Promise<{ profile: ProfileRow | null; conflict: boolean }> {
    const { data, error } = await this.getClient().rest.insert<ProfileRow>("profiles", {
      id: userId,
      alias,
    });

    if (error) {
      if (error.code === "23505" || error.status === 409) {
        return { profile: null, conflict: true };
      }

      throw mapSupabaseError(error, "No se pudo crear el perfil del usuario.");
    }

    return { profile: data?.[0] ?? null, conflict: false };
  }

  async listUserCompletions(userId: string): Promise<MissionCompletionRow[]> {
    const { data, error } = await this.getClient().rest.select<MissionCompletionRow>(
      "mission_completions",
      {
        select: "user_id,place_slug,xp_awarded,completed_at",
        user_id: `eq.${userId}`,
        order: "completed_at.asc",
      },
    );

    if (error) {
      throw mapSupabaseError(error, "No se pudieron consultar las misiones completadas.");
    }

    return data ?? [];
  }

  async listLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
    const { data, error } = await this.getClient().rest.select<LeaderboardRow>("leaderboard", {
      select: "rank,user_id,alias,total_xp",
      limit,
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudo consultar el ranking.");
    }

    return data ?? [];
  }
}
