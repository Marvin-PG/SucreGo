import { Router } from "express";
import type { RequestHandler } from "express";
import { ApiError } from "../../shared/errors.js";
import type { ProfileService } from "./profile.service.js";

export interface ProfileRouterDependencies {
  profileService: ProfileService;
  requireAuth: RequestHandler;
}

export function createProfileRouter({
  profileService,
  requireAuth,
}: ProfileRouterDependencies): Router {
  const router = Router();

  router.get("/me", requireAuth, async (req, res) => {
    if (!req.user) {
      throw new ApiError("UNAUTHORIZED", "Se requiere autenticación.");
    }

    const me = await profileService.getMe(req.user.id);
    res.status(200).json(me);
  });

  router.get("/leaderboard", async (_req, res) => {
    const leaderboard = await profileService.getLeaderboard();
    res.status(200).json(leaderboard);
  });

  return router;
}
