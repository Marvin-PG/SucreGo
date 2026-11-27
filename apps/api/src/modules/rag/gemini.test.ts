import { afterEach, describe, expect, it } from "vitest";
import { getGeminiProvider, resetGeminiProviderForTests } from "./gemini.js";

const originalEnvironment = {
  apiKey: process.env.GEMINI_API_KEY,
  chatModel: process.env.GEMINI_CHAT_MODEL,
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL,
};

afterEach(() => {
  resetGeminiProviderForTests();
  if (originalEnvironment.apiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalEnvironment.apiKey;
  }
  if (originalEnvironment.chatModel === undefined) {
    delete process.env.GEMINI_CHAT_MODEL;
  } else {
    process.env.GEMINI_CHAT_MODEL = originalEnvironment.chatModel;
  }
  if (originalEnvironment.embeddingModel === undefined) {
    delete process.env.GEMINI_EMBEDDING_MODEL;
  } else {
    process.env.GEMINI_EMBEDDING_MODEL = originalEnvironment.embeddingModel;
  }
});

describe("Gemini provider configuration", () => {
  it("can be imported without credentials or network access", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(import("./gemini.js")).resolves.toBeDefined();
  });

  it("requires a key only when the provider is requested", () => {
    delete process.env.GEMINI_API_KEY;

    expect(() => getGeminiProvider()).toThrow("GEMINI_API_KEY is required");
  });

  it("uses configured models without making a provider request", () => {
    process.env.GEMINI_API_KEY = "test-key-not-a-real-credential";
    process.env.GEMINI_CHAT_MODEL = "configured-chat-model";
    process.env.GEMINI_EMBEDDING_MODEL = "configured-embedding-model";

    const provider = getGeminiProvider();

    expect(provider.chatModel).toBe("configured-chat-model");
    expect(provider.embeddingModel).toBe("configured-embedding-model");
    expect(provider.generateText).toBeTypeOf("function");
    expect(provider.embedTexts).toBeTypeOf("function");
  });
});
