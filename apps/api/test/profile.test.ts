import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { SupabaseAuthClient } from "../src/config/supabase.js";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import type {
  LeaderboardRow,
  MissionCompletionRow,
  ProfileRepository,
  ProfileRow,
} from "../src/modules/profile/profile.repository.js";
import { ProfileService } from "../src/modules/profile/profile.service.js";
import { calculateLevel } from "../src/shared/levels.js";

const USER_ID = "2fa53087-367f-4dcf-92e1-01c6979ca813";
const SECOND_USER_ID = "5c817bf1-7290-4a8e-a761-99e560a10b32";

function createMockAuth(userId = USER_ID) {
  const authClient: SupabaseAuthClient = {
    getUser: vi.fn(async (token: string) => {
      if (token === "valid-token") {
        return { data: { user: { id: userId } }, error: null };
      }

      return { data: { user: null }, error: { message: "Invalid token", status: 401 } };
    }),
  };

  return createAuthMiddleware(() => authClient);
}

describe("calculateLevel", () => {
  it("computes Explorador (0-99), Investigador (100-199), and Cronista (200+)", () => {
    expect(calculateLevel(0)).toBe("Explorador");
    expect(calculateLevel(99)).toBe("Explorador");
    expect(calculateLevel(100)).toBe("Investigador");
    expect(calculateLevel(199)).toBe("Investigador");
    expect(calculateLevel(200)).toBe("Cronista");
    expect(calculateLevel(300)).toBe("Cronista");
  });
});

describe("ProfileService.ensureProfile", () => {
  it("returns existing profile without creating a duplicate", async () => {
    const existing: ProfileRow = {
      id: USER_ID,
      alias: "Explorador-42",
      created_at: "2026-11-27T14:00:00.000Z",
    };
    const repository: ProfileRepository = {
      findProfileById: vi.fn(async () => existing),
      createProfile: vi.fn(),
      listUserCompletions: vi.fn(async () => []),
      listLeaderboard: vi.fn(async () => []),
    };
    const service = new ProfileService({ repository });

    const profile = await service.ensureProfile(USER_ID);

    expect(profile).toEqual({
      id: USER_ID,
      alias: "Explorador-42",
      createdAt: "2026-11-27T14:00:00.000Z",
    });
    expect(repository.createProfile).not.toHaveBeenCalled();
  });

  it("retries alias generation when an alias collision occurs", async () => {
    const aliases = ["Explorador-DUP", "Explorador-NEW"];
    let index = 0;
    const repository: ProfileRepository = {
      findProfileById: vi.fn(async () => null),
      createProfile: vi.fn(async (userId, alias) => {
        if (alias === "Explorador-DUP") {
          return { profile: null, conflict: true };
        }

        return {
          profile: { id: userId, alias, created_at: "2026-11-27T14:00:00.000Z" },
          conflict: false,
        };
      }),
      listUserCompletions: vi.fn(async () => []),
      listLeaderboard: vi.fn(async () => []),
    };
    const service = new ProfileService({
      repository,
      generateAlias: () => aliases[index++] ?? "Explorador-FALLBACK",
    });

    const profile = await service.ensureProfile(USER_ID);

    expect(profile.alias).toBe("Explorador-NEW");
    expect(repository.createProfile).toHaveBeenCalledTimes(2);
  });

  it("returns existing profile cleanly on concurrent insert race for same userId", async () => {
    const existing: ProfileRow = {
      id: USER_ID,
      alias: "Explorador-RACE",
      created_at: "2026-11-27T14:00:00.000Z",
    };
    let lookupCalls = 0;
    const repository: ProfileRepository = {
      findProfileById: vi.fn(async () => {
        lookupCalls += 1;
        return lookupCalls === 1 ? null : existing;
      }),
      createProfile: vi.fn(async () => ({ profile: null, conflict: true })),
      listUserCompletions: vi.fn(async () => []),
      listLeaderboard: vi.fn(async () => []),
    };
    const service = new ProfileService({ repository, generateAlias: () => "Explorador-NEW" });

    const profile = await service.ensureProfile(USER_ID);

    expect(profile.alias).toBe("Explorador-RACE");
    expect(repository.createProfile).toHaveBeenCalledOnce();
  });
});

describe("GET /api/me & GET /api/leaderboard", () => {
  it("rejects GET /api/me without auth token", async () => {
    const app = createApp({ auth: createMockAuth() });

    const response = await request(app).get("/api/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns profile, XP, computed level, and completedPlaceSlugs on GET /api/me", async () => {
    const completions: MissionCompletionRow[] = [
      {
        user_id: USER_ID,
        place_slug: "plaza-25-de-mayo",
        xp_awarded: 100,
        completed_at: "2026-11-27T14:30:00.000Z",
      },
      {
        user_id: USER_ID,
        place_slug: "casa-de-la-libertad",
        xp_awarded: 100,
        completed_at: "2026-11-27T14:45:00.000Z",
      },
    ];
    const repository: ProfileRepository = {
      findProfileById: vi.fn(async () => null),
      createProfile: vi.fn(async (id, alias) => ({
        profile: { id, alias, created_at: "2026-11-27T14:00:00.000Z" },
        conflict: false,
      })),
      listUserCompletions: vi.fn(async () => completions),
      listLeaderboard: vi.fn(async () => []),
    };
    const app = createApp({
      auth: createMockAuth(),
      profileRepository: repository,
      generateAlias: () => "Explorador-42",
    });

    const response = await request(app).get("/api/me").set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      userId: USER_ID,
      alias: "Explorador-42",
      totalXp: 200,
      level: "Cronista",
      completedPlaceSlugs: ["plaza-25-de-mayo", "casa-de-la-libertad"],
      createdAt: "2026-11-27T14:00:00.000Z",
    });
  });

  it("returns public leaderboard entries with rank, alias, totalXp, level, and generatedAt", async () => {
    const rows: LeaderboardRow[] = [
      { rank: 1, user_id: USER_ID, alias: "Explorador-42", total_xp: 200 },
      { rank: 2, user_id: SECOND_USER_ID, alias: "Explorador-99", total_xp: 100 },
    ];
    const repository: ProfileRepository = {
      findProfileById: vi.fn(async () => null),
      createProfile: vi.fn(),
      listUserCompletions: vi.fn(async () => []),
      listLeaderboard: vi.fn(async () => rows),
    };
    const app = createApp({
      auth: createMockAuth(),
      profileRepository: repository,
      now: () => new Date("2026-11-27T15:02:00.000Z"),
    });

    const response = await request(app).get("/api/leaderboard");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [
        {
          rank: 1,
          userId: USER_ID,
          alias: "Explorador-42",
          totalXp: 200,
          level: "Cronista",
        },
        {
          rank: 2,
          userId: SECOND_USER_ID,
          alias: "Explorador-99",
          totalXp: 100,
          level: "Investigador",
        },
      ],
      generatedAt: "2026-11-27T15:02:00.000Z",
    });
  });
});
