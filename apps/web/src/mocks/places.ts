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
    slug: "lugar-candidato-1",
    name: "Lugar candidato 1",
    summary: "[TEXTO DE EJEMPLO]",
    description: "[TEXTO DE EJEMPLO]",
    coordinates: {
      // TODO: confirmar con responsable de contenido.
      latitude: null,
      // TODO: confirmar con responsable de contenido.
      longitude: null,
    },
    // TODO: confirmar con responsable de contenido.
    imageUrl: null,
    sources: [],
  },
  {
    slug: "lugar-candidato-2",
    name: "Lugar candidato 2",
    summary: "[TEXTO DE EJEMPLO]",
    description: "[TEXTO DE EJEMPLO]",
    coordinates: {
      // TODO: confirmar con responsable de contenido.
      latitude: null,
      // TODO: confirmar con responsable de contenido.
      longitude: null,
    },
    // TODO: confirmar con responsable de contenido.
    imageUrl: null,
    sources: [],
  },
  {
    slug: "lugar-candidato-3",
    name: "Lugar candidato 3",
    summary: "[TEXTO DE EJEMPLO]",
    description: "[TEXTO DE EJEMPLO]",
    coordinates: {
      // TODO: confirmar con responsable de contenido.
      latitude: null,
      // TODO: confirmar con responsable de contenido.
      longitude: null,
    },
    // TODO: confirmar con responsable de contenido.
    imageUrl: null,
    sources: [],
  },
];
