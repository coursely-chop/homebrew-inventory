/**
 * Substitute pairings for Ben's current hop rotation. Grounded in the
 * American Homebrewers Association's published chart
 * (homebrewersassociation.org/how-to-brew/hop-substitutions/) restricted to
 * pairs where BOTH hops are actually in his rotation, plus one well-
 * established modern exception noted below. This replaced an earlier
 * from-scratch guess (flavor "families" grouping Warrior in with
 * Simcoe/Centennial/Chinook/Cascade) that over-suggested Warrior — a
 * neutral high-alpha bittering hop — as an aroma substitute for things it
 * doesn't actually resemble. The AHA chart lists Warrior only as a
 * substitute for Summit, which isn't in Ben's rotation, so it now correctly
 * has no automatic substitute.
 *
 * From the chart (his hops only):
 *   Cascade    -> Ahtanum, Amarillo, Centennial       => Centennial
 *   Centennial -> Cascade, Chinook, Columbus          => Cascade, Chinook
 *   Chinook    -> Columbus, Northern Brewer, Nugget   => (none of his stock;
 *                 kept reciprocal with Centennial since that's the one
 *                 confirmed link touching Chinook)
 *   Motueka    -> Saaz, Sterling                      => Saaz
 *   Saaz       -> Sterling, Saaz (CZE), Lublin (POL)  => (none directly;
 *                 kept reciprocal with Motueka)
 *
 * Not covered by the chart at all (too new — Mosaic, Vic Secret, Idaho 7,
 * Huell Melon, Strata predate it): the Citra/Vic Secret/Mosaic tropical-
 * fruit cluster is kept as an exception since it's well-established
 * elsewhere and Ben confirmed the Citra/Vic Secret relationship himself.
 * Everything else (Warrior, Simcoe, Idaho 7, Huell Melon, UK Golding,
 * Hallertau, Strata) has no automatic suggestion — better to say nothing
 * than to guess wrong again.
 */
export const HOP_SUBSTITUTES: Record<string, string[]> = {
  Cascade: ["Centennial"],
  Centennial: ["Cascade", "Chinook"],
  Chinook: ["Centennial"],
  Motueka: ["Saaz"],
  Saaz: ["Motueka"],
  Citra: ["Vic Secret", "Mosaic"],
  "Vic Secret": ["Citra", "Mosaic"],
  Mosaic: ["Citra", "Vic Secret"],
};
