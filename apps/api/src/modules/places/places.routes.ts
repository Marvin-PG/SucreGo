import { Router } from "express";
import type { RequestHandler } from "express";
import type { PlacesService } from "./places.service.js";

export interface PlacesRouterDependencies {
  placesService: PlacesService;
  optionalAuth: RequestHandler;
}

export function createPlacesRouter({
  placesService,
  optionalAuth,
}: PlacesRouterDependencies): Router {
  const router = Router();

  router.get("/", optionalAuth, async (req, res) => {
    const result = await placesService.listPlaces(req.user?.id);
    res.status(200).json(result);
  });

  router.get("/:id", optionalAuth, async (req, res) => {
    const result = await placesService.getPlaceBySlug(req.params.id, req.user?.id);
    res.status(200).json(result);
  });

  return router;
}
