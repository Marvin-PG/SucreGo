import { Router } from "express";
import type { RequestHandler } from "express";
import { ApiError } from "../../shared/errors.js";
import type { QuizService } from "./quiz.service.js";

export interface QuizRouterDependencies {
  quizService: QuizService;
  requireAuth: RequestHandler;
}

export function createQuizRouter({ quizService, requireAuth }: QuizRouterDependencies): Router {
  const router = Router();

  router.get("/:id/quiz", requireAuth, async (req, res) => {
    const quiz = await quizService.getQuiz(req.params.id);
    res.status(200).json(quiz);
  });

  router.post("/:id/quiz/submit", requireAuth, async (req, res) => {
    if (!req.user) {
      throw new ApiError("UNAUTHORIZED", "Se requiere autenticación.");
    }

    const result = await quizService.submitQuiz(req.params.id, req.user.id, req.body);
    res.status(200).json(result);
  });

  return router;
}
