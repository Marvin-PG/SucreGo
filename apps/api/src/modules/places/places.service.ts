import { ApiError } from "../../shared/errors.js";
import { parsePlaceSlug } from "../../shared/validation.js";
import { SupabasePlacesRepository } from "./places.repository.js";
import type { PlacesRepository } from "./places.repository.js";

export type MissionStatus = "available" | "completed";

export interface PlaceListItem {
  slug: string;
  name: string;
  category: string;
  summary: string;
  coordinates: {
    latitude: number | null;
    longitude: number | null;
  };
  imageUrl: string | null;
  missionStatus: MissionStatus;
}

export interface PlacesListResponse {
  items: PlaceListItem[];
  nextCursor: null;
}

export interface PlaceSource {
  id: string;
  title: string;
  url: string | null;
  institution: string;
  consultedAt: string;
  excerpt: string;
}

export interface PlaceDetailResponse {
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  coordinates: {
    latitude: number | null;
    longitude: number | null;
  };
  imageUrl: string | null;
  missionStatus: MissionStatus;
  sources: PlaceSource[];
}

export class PlacesService {
  private readonly repository: PlacesRepository;

  constructor(repository: PlacesRepository = new SupabasePlacesRepository()) {
    this.repository = repository;
  }

  async listPlaces(userId?: string): Promise<PlacesListResponse> {
    const [places, completedSlugs] = await Promise.all([
      this.repository.findAllPlaces(),
      userId ? this.repository.findCompletedPlaceSlugsByUser(userId) : Promise.resolve([]),
    ]);
    const completedSet = new Set(completedSlugs);

    return {
      items: places.map((place) => ({
        slug: place.slug,
        name: place.name,
        category: place.category,
        summary: place.summary,
        coordinates: {
          latitude: place.latitude,
          longitude: place.longitude,
        },
        imageUrl: place.image_url,
        missionStatus: completedSet.has(place.slug) ? "completed" : "available",
      })),
      nextCursor: null,
    };
  }

  async getPlaceBySlug(rawSlug: unknown, userId?: string): Promise<PlaceDetailResponse> {
    const slug = parsePlaceSlug(rawSlug);
    const place = await this.repository.findPlaceBySlug(slug);

    if (!place) {
      throw new ApiError("NOT_FOUND", "No se encontró el lugar solicitado.");
    }

    const [sources, completedSlugs] = await Promise.all([
      this.repository.findSourcesByPlaceSlug(slug),
      userId ? this.repository.findCompletedPlaceSlugsByUser(userId) : Promise.resolve([]),
    ]);
    const completedSet = new Set(completedSlugs);

    return {
      slug: place.slug,
      name: place.name,
      category: place.category,
      summary: place.summary,
      description: place.description,
      coordinates: {
        latitude: place.latitude,
        longitude: place.longitude,
      },
      imageUrl: place.image_url,
      missionStatus: completedSet.has(place.slug) ? "completed" : "available",
      sources: sources.map((source) => ({
        id: source.id,
        title: source.title,
        url: source.url,
        institution: source.institution,
        consultedAt: source.consulted_at,
        excerpt: source.excerpt,
      })),
    };
  }
}
