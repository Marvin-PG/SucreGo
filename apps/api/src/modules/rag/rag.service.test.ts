import { describe, expect, it, vi } from "vitest";
import { GEMINI_EMBEDDING_DIMENSIONS } from "./embeddings.js";
import type { EmbeddingIndex } from "./embeddings.js";
import { GeminiProviderError } from "./gemini.js";
import { RagService } from "./rag.service.js";
import type { GeminiProvider } from "./gemini.js";
import type { Corpus } from "./types.js";

const corpus: Corpus = {
  schemaVersion: "1.0",
  project: "SucreGo",
  language: "es",
  preparedAt: "2026-11-27",
  reviewStatus: "approved",
  reviewedBy: "Roi",
  reviewedAt: "2026-11-27T14:15:55.000Z",
  usage: "Reviewed corpus.",
  places: [{ slug: "casa-de-la-libertad", name: "Casa de la Libertad" }],
  sources: [
    {
      id: "CDL-01",
      title: "Historia de la Casa de la Libertad",
      publisher: "Fundación Cultural",
      url: "https://example.org/casa",
      accessedAt: "2026-11-27",
      type: "institutional",
    },
  ],
  chunks: [
    {
      id: "cdl-independencia-02",
      placeSlug: "casa-de-la-libertad",
      topic: "Independencia",
      sourceIds: ["CDL-01"],
      text: "La fuente revisada aborda la independencia.",
    },
  ],
};

const queryVector = [1, ...Array<number>(GEMINI_EMBEDDING_DIMENSIONS - 1).fill(0)];
const embeddingIndex: EmbeddingIndex = {
  model: "test-embedding",
  dimensions: GEMINI_EMBEDDING_DIMENSIONS,
  generatedAt: "2026-11-27T15:00:00.000Z",
  records: [{ chunkId: "cdl-independencia-02", values: queryVector }],
};

function createProvider(generateText: GeminiProvider["generateText"]): GeminiProvider {
  return {
    chatModel: "test-chat",
    embeddingModel: "test-embedding",
    generateText,
    embedTexts: vi.fn(async () => [queryVector]),
  };
}

function createService(provider: GeminiProvider) {
  return new RagService({
    loadCorpus: async () => corpus,
    loadIndex: async () => embeddingIndex,
    provider: () => provider,
    now: () => new Date("2026-11-27T15:00:00.000Z"),
    createId: () => "lesson-uuid",
  });
}

describe("RagService", () => {
  it("generates a short lesson with only the place's verified sources", async () => {
    const generateText = vi.fn(async (prompt: string) => {
      expect(prompt).toContain("no completes vacíos con conocimiento externo");

      return JSON.stringify({
        title: "Una historia para descubrir",
        content: "Lección breve. ¡Anímate a iniciar el desafío!",
      });
    });
    const service = createService(createProvider(generateText));

    const lesson = await service.generateLesson("casa-de-la-libertad");

    expect(lesson).toEqual({
      lessonId: "lesson-uuid",
      placeSlug: "casa-de-la-libertad",
      title: "Una historia para descubrir",
      content: "Lección breve. ¡Anímate a iniciar el desafío!",
      sources: [corpus.sources[0]],
      createdAt: "2026-11-27T15:00:00.000Z",
    });
    expect(generateText).toHaveBeenCalledOnce();
  });

  it("answers guide questions with citations selected only from retrieved sources", async () => {
    const generateText = vi.fn(async () =>
      JSON.stringify({
        answer: "La fuente consultada trata sobre la independencia.",
        sourceIds: ["CDL-01"],
        abstained: false,
      }),
    );
    const provider = createProvider(generateText);
    const service = createService(provider);

    const answer = await service.askGuide(
      "casa-de-la-libertad",
      "¿Qué cuenta la fuente sobre la independencia?",
    );

    expect(answer).toEqual({
      answer: "La fuente consultada trata sobre la independencia.",
      citations: [
        {
          sourceId: "CDL-01",
          title: "Historia de la Casa de la Libertad",
          publisher: "Fundación Cultural",
          url: "https://example.org/casa",
        },
      ],
      abstained: false,
      createdAt: "2026-11-27T15:00:00.000Z",
    });
    expect(provider.embedTexts).toHaveBeenCalledWith([
      "¿Qué cuenta la fuente sobre la independencia?",
    ]);
  });

  it("abstains when Gemini returns a citation outside retrieved sources", async () => {
    const service = createService(
      createProvider(async () =>
        JSON.stringify({
          answer: "Respuesta sin soporte.",
          sourceIds: ["NOT-A-REAL-SOURCE"],
          abstained: false,
        }),
      ),
    );

    const answer = await service.askGuide("casa-de-la-libertad", "Pregunta");

    expect(answer.abstained).toBe(true);
    expect(answer.citations).toEqual([]);
    expect(answer.answer).toContain("No encontré información verificada");
  });

  it("returns an explicit abstention when no relevant chunks exist", async () => {
    const noChunksCorpus = { ...corpus, chunks: [] };
    const provider = createProvider(vi.fn());
    const service = new RagService({
      loadCorpus: async () => noChunksCorpus,
      loadIndex: async () => ({ ...embeddingIndex, records: [] }),
      provider: () => provider,
    });

    const answer = await service.askGuide("casa-de-la-libertad", "Pregunta");

    expect(answer.abstained).toBe(true);
    expect(provider.generateText).not.toHaveBeenCalled();
  });

  it("rejects malformed input and unknown places", async () => {
    const service = createService(createProvider(vi.fn()));

    await expect(service.askGuide("Casa de la Libertad", "pregunta")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(service.askGuide("lugar-inexistente", "pregunta")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.askGuide("casa-de-la-libertad", "  ")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("maps provider quota and timeout errors to stable service errors", async () => {
    const quotaService = createService(
      createProvider(async () => {
        throw new GeminiProviderError("quota", "private provider detail");
      }),
    );
    const timeoutService = createService(
      createProvider(async () => {
        throw new GeminiProviderError("timeout", "private provider detail");
      }),
    );

    await expect(quotaService.generateLesson("casa-de-la-libertad")).rejects.toMatchObject({
      code: "PROVIDER_QUOTA_EXCEEDED",
      status: 429,
    });
    await expect(timeoutService.generateLesson("casa-de-la-libertad")).rejects.toMatchObject({
      code: "PROVIDER_TIMEOUT",
      status: 503,
    });
  });

  it("never exposes source content or provider errors when content is not approved", async () => {
    const pendingCorpus = { ...corpus, reviewStatus: "pending_human_review" } as Corpus;
    const service = new RagService({
      loadCorpus: async () => pendingCorpus,
      provider: () => createProvider(vi.fn()),
    });

    await expect(service.generateLesson("casa-de-la-libertad")).rejects.toThrow(
      /Human approval is required/,
    );
  });
});
