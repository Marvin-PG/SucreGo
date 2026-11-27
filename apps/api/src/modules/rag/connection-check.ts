import { pathToFileURL } from "node:url";
import { getGeminiProvider } from "./gemini.js";

export async function checkGeminiConnection(): Promise<{ embeddingDimensions: number }> {
  const provider = getGeminiProvider();

  const generation = await provider.generateText(
    "Reply with exactly: SucreGo Gemini connection OK",
  );

  if (!generation.trim()) {
    throw new Error("Gemini text generation returned an empty response");
  }

  const [values] = await provider.embedTexts(["SucreGo Gemini connection check"]);

  if (!values?.length || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Gemini embedding request returned no valid vector");
  }

  return { embeddingDimensions: values.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
