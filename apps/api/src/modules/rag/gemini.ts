import { ApiError, GoogleGenAI } from "@google/genai";

export type GeminiFailureKind = "timeout" | "quota" | "unavailable";

export class GeminiProviderError extends Error {
  constructor(
    readonly kind: GeminiFailureKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GeminiProviderError";
  }
}

export interface GeminiProvider {
  chatModel: string;
  embeddingModel: string;
  generateText: (
    prompt: string,
    options?: { responseMimeType?: "application/json"; responseJsonSchema?: unknown },
  ) => Promise<string>;
  embedTexts: (texts: string[]) => Promise<number[][]>;
}

const REQUEST_TIMEOUT_MS = 20_000;

function classifyProviderFailure(error: unknown): GeminiProviderError {
  if (error instanceof GeminiProviderError) {
    return error;
  }

  if (
    error instanceof ApiError &&
    (error.status === 429 || error.status === 408 || error.status >= 500)
  ) {
    if (error.status === 429) {
      return new GeminiProviderError("quota", "Gemini request quota was exceeded", {
        cause: error,
      });
    }

    if (error.status === 408) {
      return new GeminiProviderError("timeout", "Gemini request timed out", { cause: error });
    }

    return new GeminiProviderError("unavailable", "Gemini provider is temporarily unavailable", {
      cause: error,
    });
  }

  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError" || /timeout/i.test(error.name))
  ) {
    return new GeminiProviderError("timeout", "Gemini request timed out", { cause: error });
  }

  return new GeminiProviderError("unavailable", "Gemini provider request failed", {
    cause: error,
  });
}

let provider: GeminiProvider | undefined;

export function getGeminiProvider(): GeminiProvider {
  if (typeof window !== "undefined") {
    throw new Error("Gemini provider is only available in the server runtime");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to use the Gemini provider");
  }

  if (!provider) {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    });
    const chatModel = process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-3.6-flash";
    const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";

    provider = {
      chatModel,
      embeddingModel,
      async generateText(prompt, options) {
        try {
          const response = await client.models.generateContent({
            model: chatModel,
            contents: prompt,
            config: options?.responseMimeType
              ? {
                  responseMimeType: options.responseMimeType,
                  responseJsonSchema: options.responseJsonSchema,
                }
              : undefined,
          });

          if (!response.text?.trim()) {
            throw new GeminiProviderError("unavailable", "Gemini returned an empty response");
          }

          return response.text.trim();
        } catch (error) {
          throw classifyProviderFailure(error);
        }
      },
      async embedTexts(texts) {
        if (texts.length === 0) {
          return [];
        }

        try {
          const response = await client.models.embedContent({
            model: embeddingModel,
            contents: texts,
          });
          const embeddings = response.embeddings?.map((embedding) => embedding.values ?? []);

          if (!embeddings || embeddings.length !== texts.length) {
            throw new GeminiProviderError(
              "unavailable",
              "Gemini returned an unexpected number of embeddings",
            );
          }

          return embeddings;
        } catch (error) {
          throw classifyProviderFailure(error);
        }
      },
    };
  }

  return provider;
}

export function resetGeminiProviderForTests(): void {
  provider = undefined;
}
