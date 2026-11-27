export type UserLevel = "Explorador" | "Investigador" | "Cronista";

export function calculateLevel(totalXp: number): UserLevel {
  if (totalXp >= 200) {
    return "Cronista";
  }

  if (totalXp >= 100) {
    return "Investigador";
  }

  return "Explorador";
}
