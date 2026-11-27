import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z, ZodError } from "zod";
import { getApprovedChunks } from "./corpus.js";
import type { Corpus, HeritageChunk } from "./types.js";

export const GEMINI_EMBEDDING_DIMENSIONS = 3072;
export const HERITAGE_EMBEDDINGS_PATH = fileURLToPath(
  new URL("../../../data/heritage-embeddings.json", import.meta.url),
);

const embeddingRecordSchema = z
  .object({
    chunkId: z.string().trim().min(1),
    values: z.array(z.number().finite()).length(GEMINI_EMBEDDING_DIMENSIONS),
  })
  .strict();

const embeddingIndexSchema = z
  .object({
    model: z.string().trim().min(1),
    dimensions: z.literal(GEMINI_EMBEDDING_DIMENSIONS),
    generatedAt: z.iso.datetime({ offset: true }),
    records: z.array(embeddingRecordSchema),
  })
  .strict()
  .superRefine((index, context) => {
    const chunkIds = new Set<string>();

    index.records.forEach((record, position) => {
      if (chunkIds.has(record.chunkId)) {
        context.addIssue({
          code: "custom",
          path: ["records", position, "chunkId"],
          message: `Duplicate embedding for chunk: ${record.chunkId}`,
        });
      }

      chunkIds.add(record.chunkId);

      if (record.values.every((value) => value === 0)) {
        context.addIssue({
          code: "custom",
          path: ["records", position, "values"],
          message: "Embedding vector cannot be all zeroes",
        });
      }
    });
  });

export type EmbeddingRecord = z.infer<typeof embeddingRecordSchema>;
export type EmbeddingIndex = z.infer<typeof embeddingIndexSchema>;

export class EmbeddingValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmbeddingValidationError";
  }
}

export class CorpusNotApprovedError extends Error {
  constructor() {
    super("Human approval is required before retrieving heritage content");
    this.name = "CorpusNotApprovedError";
  }
}

export function parseEmbeddingIndex(input: unknown): EmbeddingIndex {
  try {
    return embeddingIndexSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues
        .map((issue) => `${issue.path.join(".") || "index"}: ${issue.message}`)
        .join("; ");
      throw new EmbeddingValidationError(`Invalid embedding index: ${details}`, { cause: error });
    }

    throw error;
  }
}

export async function loadEmbeddingIndex(path = HERITAGE_EMBEDDINGS_PATH): Promise<EmbeddingIndex> {
  let contents: string;

  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    throw new EmbeddingValidationError("Unable to read the heritage embedding index", {
      cause: error,
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new EmbeddingValidationError("The heritage embedding index is not valid JSON", {
      cause: error,
    });
  }

  return parseEmbeddingIndex(parsed);
}

export async function saveEmbeddingIndex(
  index: EmbeddingIndex,
  path = HERITAGE_EMBEDDINGS_PATH,
): Promise<void> {
  const validatedIndex = parseEmbeddingIndex(index);
  await writeFile(path, `${JSON.stringify(validatedIndex, null, 2)}\n`, "utf8");
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    throw new EmbeddingValidationError("Embedding vectors must have matching non-zero dimensions");
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];

    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
      throw new EmbeddingValidationError("Embedding vectors must contain only finite numbers");
    }

    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    throw new EmbeddingValidationError("Embedding vectors cannot have zero magnitude");
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export interface RetrievedChunk {
  chunk: HeritageChunk;
  similarity: number;
}

export async function retrieveRelevantChunks(
  query: string,
  placeSlug: string,
  corpus: Corpus,
  index: EmbeddingIndex,
  embedQuery: (query: string) => Promise<number[]>,
  limit = 3,
): Promise<RetrievedChunk[]> {
  if (corpus.reviewStatus !== "approved") {
    throw new CorpusNotApprovedError();
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Retrieval limit must be a positive integer");
  }

  const allowedChunks = getApprovedChunks(corpus).filter(
    (chunk) => chunk.placeSlug === placeSlug || chunk.placeSlug === null,
  );
  const allowedChunkIds = new Set(allowedChunks.map((chunk) => chunk.id));
  const queryVector = await embedQuery(query);

  if (
    queryVector.length !== index.dimensions ||
    queryVector.some((value) => !Number.isFinite(value)) ||
    queryVector.every((value) => value === 0)
  ) {
    throw new EmbeddingValidationError("Query embedding has invalid dimensions or values");
  }

  const chunkById = new Map(allowedChunks.map((chunk) => [chunk.id, chunk]));
  const rankedChunks = index.records
    .filter((record) => allowedChunkIds.has(record.chunkId))
    .map((record) => ({
      chunk: chunkById.get(record.chunkId)!,
      similarity: cosineSimilarity(queryVector, record.values),
    }))
    .sort((left, right) => right.similarity - left.similarity);

  return rankedChunks.slice(0, limit);
}
