import { z } from "zod";

export const placeSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase kebab-case place slug");

const sourceSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    publisher: z.string().trim().min(1),
    url: z.string().url(),
    accessedAt: z.iso.date(),
    type: z.string().trim().min(1),
  })
  .strict();

const placeSchema = z
  .object({
    slug: placeSlugSchema,
    name: z.string().trim().min(1),
  })
  .strict();

const heritageChunkSchema = z
  .object({
    id: z.string().trim().min(1),
    placeSlug: placeSlugSchema.nullable(),
    topic: z.string().trim().min(1),
    sourceIds: z.array(z.string().trim().min(1)).min(1),
    text: z.string().trim().min(1),
  })
  .strict();

const corpusReviewStatusSchema = z.enum(["pending_human_review", "approved"]);

export const corpusSchema = z
  .object({
    schemaVersion: z.string().trim().min(1),
    project: z.literal("SucreGo"),
    language: z.string().trim().min(1),
    preparedAt: z.iso.date(),
    reviewStatus: corpusReviewStatusSchema,
    reviewedBy: z.string().trim().min(1).optional(),
    reviewedAt: z.iso.datetime({ offset: true }).optional(),
    usage: z.string().trim().min(1),
    places: z.array(placeSchema),
    sources: z.array(sourceSchema),
    chunks: z.array(heritageChunkSchema),
  })
  .strict()
  .superRefine((corpus, context) => {
    if (corpus.reviewStatus === "approved" && (!corpus.reviewedBy || !corpus.reviewedAt)) {
      context.addIssue({
        code: "custom",
        path: ["reviewStatus"],
        message: "An approved corpus requires reviewer metadata",
      });
    }

    const placeSlugs = new Set<string>();

    corpus.places.forEach((place, index) => {
      if (placeSlugs.has(place.slug)) {
        context.addIssue({
          code: "custom",
          path: ["places", index, "slug"],
          message: `Duplicate place slug: ${place.slug}`,
        });
      }

      placeSlugs.add(place.slug);
    });

    const sourceIds = new Set<string>();

    corpus.sources.forEach((source, index) => {
      if (sourceIds.has(source.id)) {
        context.addIssue({
          code: "custom",
          path: ["sources", index, "id"],
          message: `Duplicate source id: ${source.id}`,
        });
      }

      sourceIds.add(source.id);
    });

    const chunkIds = new Set<string>();

    corpus.chunks.forEach((chunk, index) => {
      if (chunkIds.has(chunk.id)) {
        context.addIssue({
          code: "custom",
          path: ["chunks", index, "id"],
          message: `Duplicate chunk id: ${chunk.id}`,
        });
      }

      chunkIds.add(chunk.id);

      if (chunk.placeSlug !== null && !placeSlugs.has(chunk.placeSlug)) {
        context.addIssue({
          code: "custom",
          path: ["chunks", index, "placeSlug"],
          message: `Chunk references unknown place slug: ${chunk.placeSlug}`,
        });
      }

      for (const sourceId of chunk.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({
            code: "custom",
            path: ["chunks", index, "sourceIds"],
            message: `Chunk references unknown source id: ${sourceId}`,
          });
        }
      }
    });
  });

export const evaluationCaseSchema = z
  .object({
    id: z.string().trim().min(1),
    placeSlug: placeSlugSchema.nullable(),
    query: z.string().trim().min(1),
    expectedAnswer: z.string().trim().min(1),
    expectedChunkIds: z.array(z.string().trim().min(1)),
    expectedAbstention: z.boolean(),
  })
  .strict();

export const evaluationCasesSchema = z.array(evaluationCaseSchema);

export type Source = z.infer<typeof sourceSchema>;
export type HeritageChunk = z.infer<typeof heritageChunkSchema>;
export type Corpus = z.infer<typeof corpusSchema>;
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
