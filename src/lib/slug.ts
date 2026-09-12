/** Turns a name into a URL/id-safe slug, disambiguating against existing ids
 * by appending -2, -3, etc. Mirrors the pt-tracker convention of human-
 * readable, stable ids rather than opaque UUIDs for user-authored content. */
export function slugify(name: string, existingIds: string[]): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
