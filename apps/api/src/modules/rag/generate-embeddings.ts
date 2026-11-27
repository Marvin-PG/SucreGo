import { pathToFileURL } from "node:url";
import { loadHeritageCorpus, getApprovedChunks } from "./corpus.js";
import {
  GEMINI_EMBEDDING_DIMENSIONS,
  parseEmbeddingIndex,
  saveEmbeddingIndex,
} from "./embeddings.js";
import { getGeminiProvider } from "./gemini.js";

export async function generateHeritageEmbeddings(): Promise<number> {
  const corpus = await loadHeritageCorpus();

  if (corpus.reviewStatus !== "approved") {
    throw new Error("The heritage corpus requires human approval before embeddings are generated");
  }

  const chunks = getApprovedChunks(corpus);

  if (chunks.length === 0) {
    throw new Error("No approved heritage chunks are available for indexing");
  }

  const provider = getGeminiProvider();
  const vectors = await provider.embedTexts(chunks.map((chunk) => chunk.text));

  if (vectors.length !== chunks.length) {
    throw new Error("Gemini returned an unexpected number of chunk embeddings");
  }

  const index = parseEmbeddingIndex({
    model: provider.embeddingModel,
    dimensions: GEMINI_EMBEDDING_DIMENSIONS,
    generatedAt: new Date().toISOString(),
    records: chunks.map((chunk, index) => ({
      chunkId: chunk.id,
      values: vectors[index],
    })),
  });

  await saveEmbeddingIndex(index);

  return index.records.length;
}

function isDirectExecution(): boolean {
  const entryPoint = process.argv[1];

  return entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href;
}

if (isDirectExecution()) {
  try {
    const count = await generateHeritageEmbeddings();
    console.info(`Generated and validated embeddings for ${count} approved heritage chunks.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown embedding generation error";
    console.error(`Heritage embedding generation failed: ${message}`);
    process.exitCode = 1;
  }
}
