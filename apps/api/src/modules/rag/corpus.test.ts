import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getApprovedChunks, loadHeritageCorpus, parseHeritageCorpus } from "./corpus.js";
import { evaluationCasesSchema } from "./types.js";
import type { Corpus } from "./types.js";

const corpusFixture: Corpus = {
  schemaVersion: "1.0",
  project: "SucreGo",
  language: "es",
  preparedAt: "2026-11-27",
  reviewStatus: "pending_human_review",
  usage: "Indexar únicamente tras revisión humana.",
  places: [{ slug: "plaza-25-de-mayo", name: "Plaza 25 de Mayo" }],
  sources: [
    {
      id: "SRC-01",
      title: "Fuente de ejemplo",
      publisher: "Institución de ejemplo",
      url: "https://example.org/source",
      accessedAt: "2026-11-27",
      type: "institutional",
    },
  ],
  chunks: [
    {
      id: "chunk-1",
      placeSlug: "plaza-25-de-mayo",
      topic: "Tema de ejemplo",
      sourceIds: ["SRC-01"],
      text: "[TEXTO DE EJEMPLO]",
    },
  ],
};

describe("heritage corpus", () => {
  it("loads the supplied corpus and keeps it pending human review", async () => {
    const corpus = await loadHeritageCorpus();

    expect(corpus.reviewStatus).toBe("pending_human_review");
    expect(corpus.sources).toHaveLength(8);
    expect(corpus.chunks).toHaveLength(14);
    expect(getApprovedChunks(corpus)).toEqual([]);
  });

  it("loads evaluation cases from a separate file", async () => {
    const evaluationPath = new URL("../../../data/heritage-evaluation-cases.json", import.meta.url);
    const parsed: unknown = JSON.parse(await readFile(evaluationPath, "utf8"));
    const cases = evaluationCasesSchema.parse(parsed);
    const corpus = await loadHeritageCorpus();
    const chunkIds = new Set(corpus.chunks.map((chunk) => chunk.id));

    expect(cases).toHaveLength(10);
    expect(
      cases.every((testCase) => testCase.expectedChunkIds.every((id) => chunkIds.has(id))),
    ).toBe(true);
  });

  it("rejects duplicate source IDs", () => {
    expect(() =>
      parseHeritageCorpus({
        ...corpusFixture,
        sources: [...corpusFixture.sources, corpusFixture.sources[0]],
      }),
    ).toThrow(/Duplicate source id: SRC-01/);
  });

  it("rejects duplicate place slugs and invalid slugs", () => {
    expect(() =>
      parseHeritageCorpus({
        ...corpusFixture,
        places: [...corpusFixture.places, { slug: "plaza-25-de-mayo", name: "Lugar duplicado" }],
      }),
    ).toThrow(/Duplicate place slug/);

    expect(() =>
      parseHeritageCorpus({
        ...corpusFixture,
        places: [{ slug: "Plaza 25", name: "Lugar inválido" }],
      }),
    ).toThrow(/lowercase kebab-case place slug/);
  });

  it("rejects chunks that reference a missing source or place", () => {
    expect(() =>
      parseHeritageCorpus({
        ...corpusFixture,
        chunks: [
          {
            ...corpusFixture.chunks[0],
            sourceIds: ["MISSING"],
          },
        ],
      }),
    ).toThrow(/unknown source id: MISSING/);

    expect(() =>
      parseHeritageCorpus({
        ...corpusFixture,
        chunks: [
          {
            ...corpusFixture.chunks[0],
            placeSlug: "lugar-inexistente",
          },
        ],
      }),
    ).toThrow(/unknown place slug: lugar-inexistente/);
  });

  it("rejects duplicate chunk IDs", () => {
    expect(() =>
      parseHeritageCorpus({
        ...corpusFixture,
        chunks: [...corpusFixture.chunks, corpusFixture.chunks[0]],
      }),
    ).toThrow(/Duplicate chunk id: chunk-1/);
  });

  it("requires human review metadata before corpus approval", () => {
    expect(() =>
      parseHeritageCorpus({
        ...corpusFixture,
        reviewStatus: "approved",
      }),
    ).toThrow(/requires reviewer metadata/);
  });

  it("does not accept evaluation cases embedded in the corpus", () => {
    expect(() =>
      parseHeritageCorpus({
        ...corpusFixture,
        evaluationCases: [],
      }),
    ).toThrow(/Unrecognized key: "evaluationCases"/);
  });

  it("only exposes chunks after a human marks the corpus approved", () => {
    const approvedCorpus = parseHeritageCorpus({
      ...corpusFixture,
      reviewStatus: "approved",
      reviewedBy: "Revisor",
      reviewedAt: "2026-11-27T00:00:00.000Z",
    });

    expect(getApprovedChunks(approvedCorpus)).toEqual(approvedCorpus.chunks);
  });
});
