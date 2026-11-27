import { Router } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { ApiError } from "../../shared/errors.js";
import { parsePlaceSlug } from "../../shared/validation.js";
import { RagServiceError, ragService } from "./rag.service.js";

const chatBody = z.object({ message: z.string().trim().min(1).max(1000) });

async function runGuide<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof RagServiceError) {
      switch (error.code) {
        case "VALIDATION_ERROR":
          throw new ApiError("VALIDATION_ERROR", error.message);
        case "NOT_FOUND":
          throw new ApiError("NOT_FOUND", error.message);
        case "PROVIDER_QUOTA_EXCEEDED":
          throw new ApiError("RATE_LIMITED", error.message);
        case "PROVIDER_TIMEOUT":
          throw new ApiError("SERVICE_UNAVAILABLE", error.message);
      }
    }

    throw new ApiError("SERVICE_UNAVAILABLE", "La guía cultural no está disponible temporalmente.");
  }
}

export function createRagRouter(requireAuth: RequestHandler): Router {
  const router = Router();

  router.post("/:id/lesson", requireAuth, async (req, res) => {
    const slug = parsePlaceSlug(req.params.id);
    const lesson = await runGuide(() => ragService.generateLesson(slug));
    res.json(lesson);
  });

  router.post("/:id/chat", requireAuth, async (req, res) => {
    const slug = parsePlaceSlug(req.params.id);
    const { message } = chatBody.parse(req.body);
    const reply = await runGuide(() => ragService.askGuide(slug, message));
    res.json(reply);
  });

  return router;
}
