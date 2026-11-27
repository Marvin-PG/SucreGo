import crypto from "node:crypto";
import { ApiError } from "../../shared/errors.js";
import { calculateLevel } from "../../shared/levels.js";
import type { UserLevel } from "../../shared/levels.js";
import { SupabaseProfileRepository } from "./profile.repository.js";
import type { ProfileRepository } from "./profile.repository.js";

export interface ProfileRecord {
  id: string;
  alias: string;
  createdAt: string;
}

export interface MeResponse {
  userId: string;
  alias: string;
  totalXp: number;
  level: UserLevel;
  completedPlaceSlugs: string[];
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  alias: string;
  totalXp: number;
  level: UserLevel;
}

export interface LeaderboardResponse {
  items: LeaderboardEntry[];
  generatedAt: string;
}

export interface ProfileServiceDependencies {
  repository?: ProfileRepository;
  generateAlias?: () => string;
  now?: () => Date;
}

const MAX_ALIAS_RETRIES = 5;

function defaultGenerateAlias(): string {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `Explorador-${suffix}`;
}

export class ProfileService {
  private readonly repository: ProfileRepository;
  private readonly generateAlias: () => string;
  private readonly now: () => Date;

  constructor(dependencies: ProfileServiceDependencies = {}) {
    this.repository = dependencies.repository ?? new SupabaseProfileRepository();
    this.generateAlias = dependencies.generateAlias ?? defaultGenerateAlias;
    this.now = dependencies.now ?? (() => new Date());
  }

  async ensureProfile(userId: string): Promise<ProfileRecord> {
    const existing = await this.repository.findProfileById(userId);

    if (existing) {
      return {
        id: existing.id,
        alias: existing.alias,
        createdAt: existing.created_at,
      };
    }

    for (let attempt = 0; attempt < MAX_ALIAS_RETRIES; attempt += 1) {
      const alias = this.generateAlias().trim();
      const { profile, conflict } = await this.repository.createProfile(userId, alias);

      if (profile) {
        return {
          id: profile.id,
          alias: profile.alias,
          createdAt: profile.created_at,
        };
      }

      if (conflict) {
        const concurrentProfile = await this.repository.findProfileById(userId);

        if (concurrentProfile) {
          return {
            id: concurrentProfile.id,
            alias: concurrentProfile.alias,
            createdAt: concurrentProfile.created_at,
          };
        }
      }
    }

    throw new ApiError("INTERNAL_ERROR", "No se pudo generar un alias único para el perfil.");
  }

  async getMe(userId: string): Promise<MeResponse> {
    const profile = await this.ensureProfile(userId);
    const completions = await this.repository.listUserCompletions(userId);
    const totalXp = completions.reduce((sum, item) => sum + item.xp_awarded, 0);

    return {
      userId: profile.id,
      alias: profile.alias,
      totalXp,
      level: calculateLevel(totalXp),
      completedPlaceSlugs: completions.map((item) => item.place_slug),
      createdAt: profile.createdAt,
    };
  }

  async getLeaderboard(): Promise<LeaderboardResponse> {
    const rows = await this.repository.listLeaderboard();

    return {
      items: rows.map((row) => ({
        rank: row.rank,
        userId: row.user_id,
        alias: row.alias,
        totalXp: row.total_xp,
        level: calculateLevel(row.total_xp),
      })),
      generatedAt: this.now().toISOString(),
    };
  }
}
