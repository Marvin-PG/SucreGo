import express from "express";
import type { Express, NextFunction, Request, Response, Router } from "express";
import { createAuthMiddleware } from "./middleware/auth.js";
import type { AuthMiddlewares } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { createPlacesRouter } from "./modules/places/places.routes.js";
import type { PlacesRepository } from "./modules/places/places.repository.js";
import { PlacesService } from "./modules/places/places.service.js";
import { createProfileRouter } from "./modules/profile/profile.routes.js";
import type { ProfileRepository } from "./modules/profile/profile.repository.js";
import { ProfileService } from "./modules/profile/profile.service.js";
import { createQuizRouter } from "./modules/quiz/quiz.routes.js";
import type { QuizRepository } from "./modules/quiz/quiz.repository.js";
import { QuizService } from "./modules/quiz/quiz.service.js";

export interface AppDependencies {
  auth?: AuthMiddlewares;
  placesRepository?: PlacesRepository;
  quizRepository?: QuizRepository;
  profileRepository?: ProfileRepository;
  generateAlias?: () => string;
  now?: () => Date;
  /** Optional router for RAG endpoints (POST /:id/lesson and POST /:id/chat) mounted under /api/places. */
  ragRouter?: Router;
}

function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header("origin");
  res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const auth = dependencies.auth ?? createAuthMiddleware();
  const profileService = new ProfileService({
    repository: dependencies.profileRepository,
    generateAlias: dependencies.generateAlias,
    now: dependencies.now,
  });
  const placesService = new PlacesService(dependencies.placesRepository);
  const quizService = new QuizService({
    repository: dependencies.quizRepository,
    ensureProfile: (userId) => profileService.ensureProfile(userId),
  });

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use(
    "/api/places",
    createPlacesRouter({ placesService, optionalAuth: auth.optionalAuth }),
    createQuizRouter({ quizService, requireAuth: auth.requireAuth }),
  );

  // Extension point for Roi's RAG routes (POST /api/places/:id/lesson and POST /api/places/:id/chat)
  if (dependencies.ragRouter) {
    app.use("/api/places", dependencies.ragRouter);
  }

  app.use("/api", createProfileRouter({ profileService, requireAuth: auth.requireAuth }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
