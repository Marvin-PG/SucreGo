import { z } from "zod";
import { ApiError } from "./errors.js";

export const placeSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El identificador del lugar no es válido.");

export const uuidSchema = z.string().uuid("Se esperaba un UUID válido.");

export function parsePlaceSlug(rawSlug: unknown): string {
  const parsed = placeSlugSchema.safeParse(rawSlug);

  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", "El identificador del lugar no es válido.", {
      field: "id",
    });
  }

  return parsed.data;
}
