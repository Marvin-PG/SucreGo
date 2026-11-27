import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getSupabaseClient } from "../config/supabase.js";
import type { SupabaseAuthClient } from "../config/supabase.js";
import { ApiError } from "../shared/errors.js";

export interface AuthenticatedUser {
  id: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return match?.[1] ?? null;
}

export interface AuthMiddlewares {
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

export function createAuthMiddleware(
  getAuthClient: () => SupabaseAuthClient = () => getSupabaseClient().auth,
): AuthMiddlewares {
  const requireAuth: RequestHandler = async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const token = extractBearerToken(req.header("authorization"));

    if (!token) {
      next(new ApiError("UNAUTHORIZED", "Se requiere autenticación con un token Bearer válido."));
      return;
    }

    let authClient: SupabaseAuthClient;

    try {
      authClient = getAuthClient();
    } catch (error) {
      next(
        new ApiError(
          "SERVICE_UNAVAILABLE",
          "El servicio de autenticación no está disponible.",
          undefined,
          { cause: error },
        ),
      );
      return;
    }

    const result = await authClient.getUser(token);

    if (result.error?.isNetworkError || (result.error?.status && result.error.status >= 500)) {
      next(
        new ApiError(
          "SERVICE_UNAVAILABLE",
          "No se pudo validar la sesión con el servicio de autenticación.",
        ),
      );
      return;
    }

    const userId = result.data?.user?.id;

    if (result.error || !userId) {
      next(new ApiError("UNAUTHORIZED", "El token de autenticación es inválido o expiró."));
      return;
    }

    req.user = { id: userId };
    next();
  };

  const optionalAuth: RequestHandler = async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const token = extractBearerToken(req.header("authorization"));

    if (!token) {
      next();
      return;
    }

    try {
      const result = await getAuthClient().getUser(token);
      const userId = result.data?.user?.id;

      if (!result.error && userId) {
        req.user = { id: userId };
      }
    } catch {
      // Public endpoints degrade gracefully when optional auth cannot verify a token.
    }

    next();
  };

  return { requireAuth, optionalAuth };
}

const defaultAuth = createAuthMiddleware();

export const requireAuth: RequestHandler = defaultAuth.requireAuth;
export const optionalAuth: RequestHandler = defaultAuth.optionalAuth;
