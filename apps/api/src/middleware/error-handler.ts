import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError, buildErrorResponse } from "../shared/errors.js";

function isJsonSyntaxError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number" &&
    (error as { status: number }).status === 400
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.requestId ?? crypto.randomUUID();
  res.status(404).json(buildErrorResponse("NOT_FOUND", "La ruta solicitada no existe.", requestId));
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  void _next;
  const requestId = req.requestId ?? crypto.randomUUID();

  if (error instanceof ApiError) {
    res
      .status(error.status)
      .json(buildErrorResponse(error.code, error.message, requestId, error.details));
    return;
  }

  if (error instanceof ZodError) {
    const firstPath = error.issues[0]?.path.join(".");
    res
      .status(400)
      .json(
        buildErrorResponse(
          "VALIDATION_ERROR",
          "La solicitud no es válida.",
          requestId,
          firstPath ? { field: firstPath } : undefined,
        ),
      );
    return;
  }

  if (isJsonSyntaxError(error)) {
    res
      .status(400)
      .json(buildErrorResponse("VALIDATION_ERROR", "El cuerpo JSON no es válido.", requestId));
    return;
  }

  res
    .status(500)
    .json(
      buildErrorResponse("INTERNAL_ERROR", "Ocurrió un error interno en el servidor.", requestId),
    );
}
