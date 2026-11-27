export interface PlaceFixture {
  slug: string;
  name: string;
  summary: string;
  description: string;
  coordinates: {
    latitude: number | null;
    longitude: number | null;
  };
  imageUrl: string | null;
  sources: [];
}

export const placeFixtures: PlaceFixture[] = [
  {
    slug: "plaza-25-de-mayo",
    name: "Plaza 25 de Mayo",
    summary: "[TEXTO DE EJEMPLO]",
    description: "[TEXTO DE EJEMPLO]",
    coordinates: {
      latitude: -19.0479,
      longitude: -65.25952,
    },
    // TODO: confirmar con responsable de contenido.
    imageUrl: null,
    sources: [],
  },
  {
    slug: "casa-de-la-libertad",
    name: "Casa de la Libertad",
    summary: "[TEXTO DE EJEMPLO]",
    description: "[TEXTO DE EJEMPLO]",
    coordinates: {
      latitude: -19.04745,
      longitude: -65.26038,
    },
    // TODO: confirmar con responsable de contenido.
    imageUrl: null,
    sources: [],
  },
  {
    slug: "la-recoleta",
    name: "La Recoleta",
    summary: "[TEXTO DE EJEMPLO]",
    description: "[TEXTO DE EJEMPLO]",
    coordinates: {
      latitude: -19.05451,
      longitude: -65.25398,
    },
    // TODO: confirmar con responsable de contenido.
    imageUrl: null,
    sources: [],
  },
];
