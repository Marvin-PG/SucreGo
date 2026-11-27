import { pathToFileURL } from "node:url";
import { getGeminiProvider } from "./gemini.js";

export async function checkGeminiConnection(): Promise<{ embeddingDimensions: number }> {
  const { client, chatModel, embeddingModel } = getGeminiProvider();

  const generation = await client.models.generateContent({
    model: chatModel,
    contents: "Reply with exactly: SucreGo Gemini connection OK",
  });

  if (!generation.text?.trim()) {
    throw new Error("Gemini text generation returned an empty response");
  }

  const embedding = await client.models.embedContent({
    model: embeddingModel,
    contents: "SucreGo Gemini connection check",
  });
  const values = embedding.embeddings?.[0]?.values;

  if (!values?.length || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Gemini embedding request returned no valid vector");
  }

  return { embeddingDimensions: values.length };
}

function isDirectExecution(): boolean {
  const entryPoint = process.argv[1];

  return entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href;
}

if (isDirectExecution()) {
  try {
    const result = await checkGeminiConnection();
    console.info(
      `Gemini text generation and embedding connection verified (${result.embeddingDimensions} dimensions).`,
    );
  } catch (error) {
    const apiKey = process.env.GEMINI_API_KEY;
    const message = error instanceof Error ? error.message : "Unknown connection error";
    const safeMessage = apiKey ? message.replaceAll(apiKey, "[REDACTED]") : message;
    console.error(`Gemini connection check failed: ${safeMessage}`);
    process.exitCode = 1;
  }
}
