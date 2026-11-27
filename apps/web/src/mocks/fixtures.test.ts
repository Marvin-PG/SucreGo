import { describe, expect, it } from "vitest";
import { placeFixtures } from "./places";
import { quizFixtures } from "./quizzes";

describe("mock fixtures", () => {
  it("provides three candidate places with placeholder historical text", () => {
    expect(placeFixtures).toHaveLength(3);
    expect(placeFixtures.map((place) => place.slug)).toEqual([
      "plaza-25-de-mayo",
      "casa-de-la-libertad",
      "la-recoleta",
    ]);
    expect(placeFixtures.map(({ coordinates }) => coordinates)).toEqual([
      { latitude: -19.0479, longitude: -65.25952 },
      { latitude: -19.04745, longitude: -65.26038 },
      { latitude: -19.05451, longitude: -65.25398 },
    ]);
    expect(
      placeFixtures.every(
        (place) =>
          place.summary === "[TEXTO DE EJEMPLO]" && place.description === "[TEXTO DE EJEMPLO]",
      ),
    ).toBe(true);
  });

  it("provides quiz questions without correct answers", () => {
    expect(quizFixtures).toHaveLength(3);
    expect(quizFixtures.map(({ placeSlug }) => placeSlug)).toEqual(
      placeFixtures.map(({ slug }) => slug),
    );

    for (const quiz of quizFixtures) {
      expect(quiz.questions).toHaveLength(3);
      expect(JSON.stringify(quiz)).not.toMatch(/correct|answer/i);
    }
  });
});
