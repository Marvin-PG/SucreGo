import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { corpusSchema } from "./types.js";
import type { Corpus, HeritageChunk } from "./types.js";

export const HERITAGE_CORPUS_PATH = fileURLToPath(
  new URL("../../../data/heritage-corpus.json", import.meta.url),
);

export class CorpusValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CorpusValidationError";
  }
}

export function parseHeritageCorpus(input: unknown): Corpus {
  try {
    return corpusSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues
        .map((issue) => `${issue.path.join(".") || "corpus"}: ${issue.message}`)
        .join("; ");
      throw new CorpusValidationError(`Invalid heritage corpus: ${details}`, { cause: error });
    }

    throw error;
  }
}

export async function loadHeritageCorpus(path = HERITAGE_CORPUS_PATH): Promise<Corpus> {
  let contents: string;

  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    throw new CorpusValidationError("Unable to read the heritage corpus file", { cause: error });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new CorpusValidationError("The heritage corpus file is not valid JSON", { cause: error });
  }

  return parseHeritageCorpus(parsed);
}

export function getApprovedChunks(corpus: Corpus): HeritageChunk[] {
  return corpus.reviewStatus === "approved" ? corpus.chunks : [];
}
