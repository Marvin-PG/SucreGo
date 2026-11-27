import { getSupabaseClient } from "../../config/supabase.js";
import type { SupabaseClient, SupabaseError } from "../../config/supabase.js";
import { ApiError } from "../../shared/errors.js";

export interface PlaceRow {
  slug: string;
  name: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  summary: string;
  description: string;
  image_url: string | null;
}

export interface SourceRow {
  id: string;
  place_slug: string;
  title: string;
  url: string | null;
  institution: string;
  consulted_at: string;
  excerpt: string;
}

interface CompletedPlaceRow {
  place_slug: string;
}

export interface PlacesRepository {
  findAllPlaces(): Promise<PlaceRow[]>;
  findPlaceBySlug(slug: string): Promise<PlaceRow | null>;
  findSourcesByPlaceSlug(slug: string): Promise<SourceRow[]>;
  findCompletedPlaceSlugsByUser(userId: string): Promise<string[]>;
}

function mapSupabaseError(error: SupabaseError, fallbackMessage: string): ApiError {
  if (error.isNetworkError || (error.status !== undefined && error.status >= 500)) {
    return new ApiError(
      "SERVICE_UNAVAILABLE",
      "La base de datos no está disponible temporalmente.",
    );
  }

  return new ApiError("INTERNAL_ERROR", fallbackMessage);
}

export class SupabasePlacesRepository implements PlacesRepository {
  constructor(private readonly getClient: () => SupabaseClient = getSupabaseClient) {}

  async findAllPlaces(): Promise<PlaceRow[]> {
    const { data, error } = await this.getClient().rest.select<PlaceRow>("places", {
      select: "slug,name,category,latitude,longitude,summary,description,image_url",
      order: "slug.asc",
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudieron obtener los lugares.");
    }

    return data ?? [];
  }

  async findPlaceBySlug(slug: string): Promise<PlaceRow | null> {
    const { data, error } = await this.getClient().rest.select<PlaceRow>("places", {
      select: "slug,name,category,latitude,longitude,summary,description,image_url",
      slug: `eq.${slug}`,
      limit: 1,
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudo obtener el detalle del lugar.");
    }

    return data?.[0] ?? null;
  }

  async findSourcesByPlaceSlug(slug: string): Promise<SourceRow[]> {
    const { data, error } = await this.getClient().rest.select<SourceRow>("sources", {
      select: "id,place_slug,title,url,institution,consulted_at,excerpt",
      place_slug: `eq.${slug}`,
      order: "consulted_at.desc",
    });

    if (error) {
      throw mapSupabaseError(error, "No se pudieron obtener las fuentes del lugar.");
    }

    return data ?? [];
  }

  async findCompletedPlaceSlugsByUser(userId: string): Promise<string[]> {
    const { data, error } = await this.getClient().rest.select<CompletedPlaceRow>(
      "mission_completions",
      {
        select: "place_slug",
        user_id: `eq.${userId}`,
      },
    );

    if (error) {
      throw mapSupabaseError(error, "No se pudo consultar el estado de misiones del usuario.");
    }

    return (data ?? []).map((row) => row.place_slug);
  }
}
