import { pathToFileURL } from "node:url";
import { RagService } from "./rag.service.js";

export async function runRagLiveCheck(): Promise<{
  lessonSourceCount: number;
  guideCitationCount: number;
}> {
  const service = new RagService();
  const lesson = await service.generateLesson("casa-de-la-libertad");
  const response = await service.askGuide(
    "casa-de-la-libertad",
    "¿Qué información verificada hay sobre la independencia?",
  );

  if (lesson.sources.length === 0) {
    throw new Error("Live lesson generation returned no verified sources");
  }

  if (response.abstained || response.citations.length === 0) {
    throw new Error("Live guide check did not return a verifiable cited answer");
  }

  return {
    lessonSourceCount: lesson.sources.length,
    guideCitationCount: response.citations.length,
  };
}

function isDirectExecution(): boolean {
  const entryPoint = process.argv[1];

  return entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href;
}

if (isDirectExecution()) {
  try {
    const result = await runRagLiveCheck();
    console.info(
      `Gemini lesson generation verified (${result.lessonSourceCount} sources); guide response verified (${result.guideCitationCount} citations).`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown live RAG check error";
    console.error(`Live RAG check failed: ${message}`);
    process.exitCode = 1;
  }
}
