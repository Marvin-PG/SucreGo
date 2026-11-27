import { GoogleGenAI } from "@google/genai";

export interface GeminiProvider {
  client: GoogleGenAI;
  chatModel: string;
  embeddingModel: string;
}

let client: GoogleGenAI | undefined;

export function getGeminiProvider(): GeminiProvider {
  if (typeof window !== "undefined") {
    throw new Error("Gemini provider is only available in the server runtime");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to use the Gemini provider");
  }

  client ??= new GoogleGenAI({ apiKey });

  return {
    client,
    chatModel: process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-3.6-flash",
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001",
  };
}
