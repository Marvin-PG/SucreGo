import { describe, expect, it } from "vitest";
import { placeFixtures } from "./places";
import { quizFixtures } from "./quizzes";

describe("mock fixtures", () => {
  it("provides three candidate places with placeholder historical text", () => {
    expect(placeFixtures).toHaveLength(3);
    expect(placeFixtures.every((place) => place.summary === "[TEXTO DE EJEMPLO]")).toBe(true);
    expect(placeFixtures.every((place) => place.description === "[TEXTO DE EJEMPLO]")).toBe(true);
  });

  it("provides quiz questions without correct answers", () => {
    expect(quizFixtures).toHaveLength(3);

    for (const quiz of quizFixtures) {
      expect(quiz.questions).toHaveLength(3);
      expect(JSON.stringify(quiz)).not.toMatch(/correct|answer/i);
    }
  });
});
