import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { SupabaseAuthClient } from "../src/config/supabase.js";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import type {
  PlaceRow,
  PlacesRepository,
  SourceRow,
} from "../src/modules/places/places.repository.js";

const USER_ID = "2fa53087-367f-4dcf-92e1-01c6979ca813";

const SAMPLE_PLACES: PlaceRow[] = [
  {
    slug: "casa-de-la-libertad",
    name: "Casa de la Libertad",
    category: "Patrimonio histórico",
    latitude: -19.04745,
    longitude: -65.26038,
    summary: "[TEXTO DE EJEMPLO]",
    description: "[TEXTO DE EJEMPLO]",
    image_url: null,
  },
  {
    slug: "plaza-25-de-mayo",
    name: "Plaza 25 de Mayo",
    category: "Plaza histórica",
    latitude: -19.0479,
    longitude: -65.25952,
    summary: "[TEXTO DE EJEMPLO]",
    description: "[TEXTO DE EJEMPLO]",
    image_url: null,
  },
];

const SAMPLE_SOURCES: SourceRow[] = [
  {
    id: "04639bbc-12b6-4115-b8e9-227ad22bd903",
    place_slug: "casa-de-la-libertad",
    title: "Archivo Histórico",
    url: "https://example.org/source",
    institution: "Fundación Cultural",
    consulted_at: "2026-11-27T15:00:00.000Z",
    excerpt: "[TEXTO DE EJEMPLO]",
  },
];

function createTestSetup(completedSlugs: string[] = []) {
  const authClient: SupabaseAuthClient = {
    getUser: vi.fn(async (token: string) => {
      if (token === "valid-token") {
        return { data: { user: { id: USER_ID } }, error: null };
      }

      return { data: { user: null }, error: { message: "Invalid token", status: 401 } };
    }),
  };

  const placesRepository: PlacesRepository = {
    findAllPlaces: vi.fn(async () => SAMPLE_PLACES),
    findPlaceBySlug: vi.fn(async (slug) => SAMPLE_PLACES.find((p) => p.slug === slug) ?? null),
    findSourcesByPlaceSlug: vi.fn(async (slug) =>
      SAMPLE_SOURCES.filter((source) => source.place_slug === slug),
    ),
    findCompletedPlaceSlugsByUser: vi.fn(async () => completedSlugs),
  };

  const app = createApp({
    auth: createAuthMiddleware(() => authClient),
    placesRepository,
  });

  return { app, placesRepository };
}

describe("GET /api/places", () => {
  it("lists places as available for unauthenticated requests", async () => {
    const { app, placesRepository } = createTestSetup(["casa-de-la-libertad"]);

    const response = await request(app).get("/api/places");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [
        {
          slug: "casa-de-la-libertad",
          name: "Casa de la Libertad",
          category: "Patrimonio histórico",
          summary: "[TEXTO DE EJEMPLO]",
          coordinates: { latitude: -19.04745, longitude: -65.26038 },
          imageUrl: null,
          missionStatus: "available",
        },
        {
          slug: "plaza-25-de-mayo",
          name: "Plaza 25 de Mayo",
          category: "Plaza histórica",
          summary: "[TEXTO DE EJEMPLO]",
          coordinates: { latitude: -19.0479, longitude: -65.25952 },
          imageUrl: null,
          missionStatus: "available",
        },
      ],
      nextCursor: null,
    });
    expect(placesRepository.findCompletedPlaceSlugsByUser).not.toHaveBeenCalled();
  });

  it("marks completed missions for authenticated requests", async () => {
    const { app, placesRepository } = createTestSetup(["casa-de-la-libertad"]);

    const response = await request(app)
      .get("/api/places")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.items[0].missionStatus).toBe("completed");
    expect(response.body.items[1].missionStatus).toBe("available");
    expect(placesRepository.findCompletedPlaceSlugsByUser).toHaveBeenCalledWith(USER_ID);
  });
});

describe("GET /api/places/:id", () => {
  it("returns place detail with sources and missionStatus for authenticated user", async () => {
    const { app } = createTestSetup(["casa-de-la-libertad"]);

    const response = await request(app)
      .get("/api/places/casa-de-la-libertad")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      slug: "casa-de-la-libertad",
      name: "Casa de la Libertad",
      category: "Patrimonio histórico",
      summary: "[TEXTO DE EJEMPLO]",
      description: "[TEXTO DE EJEMPLO]",
      coordinates: { latitude: -19.04745, longitude: -65.26038 },
      imageUrl: null,
      missionStatus: "completed",
      sources: [
        {
          id: "04639bbc-12b6-4115-b8e9-227ad22bd903",
          title: "Archivo Histórico",
          url: "https://example.org/source",
          institution: "Fundación Cultural",
          consultedAt: "2026-11-27T15:00:00.000Z",
          excerpt: "[TEXTO DE EJEMPLO]",
        },
      ],
    });
  });

  it("returns 404 NOT_FOUND for a valid slug that does not exist", async () => {
    const { app } = createTestSetup();

    const response = await request(app).get("/api/places/lugar-inexistente");

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(typeof response.body.error.requestId).toBe("string");
  });

  it("returns 400 VALIDATION_ERROR for an invalid slug format", async () => {
    const { app } = createTestSetup();

    const response = await request(app).get("/api/places/Casa_De_La_Libertad");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: { field: "id" },
    });
  });
});
