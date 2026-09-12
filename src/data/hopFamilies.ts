/**
 * Rough flavor-family groupings for Ben's current hop rotation, used to
 * suggest a substitute when a recipe is short on a specific hop. This is a
 * starting guess from general hop-flavor knowledge, not from Ben's own
 * palate — expect to correct/extend it as he brews with substitutes and
 * finds out what actually works. Grouped, not pairwise, so any two hops in
 * the same list are considered swappable candidates for each other.
 */
export const HOP_FAMILIES: string[][] = [
  // Tropical / citrus / dank
  ["Citra", "Vic Secret", "Mosaic", "Idaho 7", "Strata"],
  // Piney / resinous / citrus-forward bittering
  ["Simcoe", "Centennial", "Chinook", "Cascade", "Warrior"],
  // Noble / floral / herbal
  ["Saaz", "Hallertau"],
];
