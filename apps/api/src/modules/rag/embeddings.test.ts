import { describe, expect, it, vi } from "vitest";
import {
  cosineSimilarity,
  GEMINI_EMBEDDING_DIMENSIONS,
  parseEmbeddingIndex,
  retrieveRelevantChunks,
} from "./embeddings.js";
import type { Corpus } from "./types.js";

const approvedCorpus: Corpus = {
  schemaVersion: "1.0",
  project: "SucreGo",
  language: "es",
  preparedAt: "2026-11-27",
  reviewStatus: "approved",
  reviewedBy: "Roi",
  reviewedAt: "2026-11-27T14:15:55.000Z",
  usage: "Reviewed corpus.",
  places: [
    { slug: "plaza-25-de-mayo", name: "Plaza 25 de Mayo" },
    { slug: "la-recoleta", name: "La Recoleta" },
  ],
  sources: [
    {
      id: "SRC-01",
      title: "Source",
      publisher: "Publisher",
      url: "https://example.org/source",
      accessedAt: "2026-11-27",
      type: "institutional",
    },
  ],
  chunks: [
    {
      id: "place-chunk",
      placeSlug: "plaza-25-de-mayo",
      topic: "Place",
      sourceIds: ["SRC-01"],
      text: "Place information",
    },
    {
      id: "global-chunk",
      placeSlug: null,
      topic: "General",
      sourceIds: ["SRC-01"],
      text: "General Sucre information",
    },
    {
      id: "other-place-chunk",
      placeSlug: "la-recoleta",
      topic: "Other",
      sourceIds: ["SRC-01"],
      text: "Other place information",
    },
  ],
};

function vector(firstValue: number, secondValue = 0): number[] {
  return [firstValue, secondValue, ...Array<number>(GEMINI_EMBEDDING_DIMENSIONS - 2).fill(0)];
}

function indexWith(records: { chunkId: string; values: number[] }[]) {
  return parseEmbeddingIndex({
    model: "gemini-embedding-001",
    dimensions: GEMINI_EMBEDDING_DIMENSIONS,
    generatedAt: "2026-11-27T15:00:00.000Z",
    records,
  });
}

describe("semantic embeddings", () => {
  it("calculates cosine similarity and rejects invalid vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(() => cosineSimilarity([1], [1, 0])).toThrow(/matching/);
    expect(() => cosineSimilarity([0, 0], [1, 0])).toThrow(/zero magnitude/);
    expect(() => cosineSimilarity([Number.NaN], [1])).toThrow(/finite/);
  });

  it("validates vector dimensions, finite values and non-zero magnitude", () => {
    expect(() =>
      parseEmbeddingIndex({
        model: "gemini-embedding-001",
        dimensions: GEMINI_EMBEDDING_DIMENSIONS,
        generatedAt: "2026-11-27T15:00:00.000Z",
        records: [{ chunkId: "short", values: [1, 0] }],
      }),
    ).toThrow(/3072/);

    expect(() => indexWith([{ chunkId: "zero", values: vector(0) }])).toThrow(/zeroes/);
    expect(() => indexWith([{ chunkId: "nan", values: vector(Number.NaN) }])).toThrow(
      /expected number, received NaN/,
    );
  });

  it("retrieves the top three matching place and general chunks, excluding other places", async () => {
    const embeddingIndex = indexWith([
      { chunkId: "place-chunk", values: vector(0.9, 0.1) },
      { chunkId: "global-chunk", values: vector(0.8, 0.2) },
      { chunkId: "other-place-chunk", values: vector(1, 0) },
    ]);
    const embedQuery = vi.fn(async () => vector(1, 0));

    const results = await retrieveRelevantChunks(
      "consulta",
      "plaza-25-de-mayo",
      approvedCorpus,
      embeddingIndex,
      embedQuery,
    );

    expect(results.map(({ chunk }) => chunk.id)).toEqual(["place-chunk", "global-chunk"]);
    expect(embedQuery).toHaveBeenCalledWith("consulta");
  });

  it("returns no more than the requested top three chunks", async () => {
    const manyChunks: Corpus = {
      ...approvedCorpus,
      chunks: Array.from({ length: 5 }, (_, position) => ({
        ...approvedCorpus.chunks[0],
        id: `place-${position}`,
      })),
    };
    const embeddingIndex = indexWith(
      manyChunks.chunks.map((chunk, position) => ({
        chunkId: chunk.id,
        values: vector(1, position / 10),
      })),
    );

    const results = await retrieveRelevantChunks(
      "consulta",
      "plaza-25-de-mayo",
      manyChunks,
      embeddingIndex,
      async () => vector(1, 0),
    );

    expect(results).toHaveLength(3);
  });

  it("refuses retrieval until corpus human approval and validates query vectors", async () => {
    const pendingCorpus = { ...approvedCorpus, reviewStatus: "pending_human_review" } as Corpus;
    const embeddingIndex = indexWith([{ chunkId: "place-chunk", values: vector(1) }]);

    await expect(
      retrieveRelevantChunks(
        "consulta",
        "plaza-25-de-mayo",
        pendingCorpus,
        embeddingIndex,
        async () => vector(1),
      ),
    ).rejects.toThrow(/Human approval/);

    await expect(
      retrieveRelevantChunks(
        "consulta",
        "plaza-25-de-mayo",
        approvedCorpus,
        embeddingIndex,
        async () => [1, 0],
      ),
    ).rejects.toThrow(/invalid dimensions or values/);
  });
});
