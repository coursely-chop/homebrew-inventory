import substantialXml from "../data/recipes/substantial-02.xml?raw";
import hangerXml from "../data/recipes/hanger.xml?raw";
import nzPilsXml from "../data/recipes/nz-pils.xml?raw";
import substantialHopSubXml from "../data/recipes/substantial-02-hop-sub.xml?raw";
import { parseBeerXML } from "./beerxml";
import type { Recipe } from "../types";

export const STORAGE_KEY = "homebrew-recipes-data";

// Grainfather recipes pulled in at launch via BeerXML export (see PRD: no
// public API, so this is the realistic import path). Seeded once into
// localStorage on first load, same as the inventory baseline — after that,
// further imports go through the in-app importer.
const SEED_RECIPES: { xml: string; sourceFile: string }[] = [
  { xml: substantialXml, sourceFile: "substantial-02.xml" },
  { xml: hangerXml, sourceFile: "hanger.xml" },
  { xml: nzPilsXml, sourceFile: "nz-pils.xml" },
  { xml: substantialHopSubXml, sourceFile: "substantial-02-hop-sub.xml" },
];

function buildSeedRecipes(): Recipe[] {
  const recipes: Recipe[] = [];
  for (const { xml, sourceFile } of SEED_RECIPES) {
    recipes.push(...parseBeerXML(xml, sourceFile, recipes.map((r) => r.id)));
  }
  return recipes;
}

export function loadRecipes(): Recipe[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw) as Recipe[];

  const seeded = buildSeedRecipes();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveRecipes(recipes: Recipe[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

/** Appends newly imported recipes and persists the whole set. */
export function addRecipes(newRecipes: Recipe[]): Recipe[] {
  const recipes = [...loadRecipes(), ...newRecipes];
  saveRecipes(recipes);
  return recipes;
}

export function deleteRecipe(id: string): Recipe[] {
  const recipes = loadRecipes().filter((r) => r.id !== id);
  saveRecipes(recipes);
  return recipes;
}

/** Replaces one recipe in storage (by id) and persists the whole set. */
export function updateRecipe(recipe: Recipe): Recipe[] {
  const recipes = loadRecipes().map((r) => (r.id === recipe.id ? recipe : r));
  saveRecipes(recipes);
  return recipes;
}

/** Re-parses the bundled BeerXML files fresh and replaces each of their
 * recipes in storage — the fix for the recurring "I corrected a parsing bug
 * but browsers that already loaded recipes before the fix don't see it"
 * problem (e.g. the hop-weight rounding fix). Only touches bundled recipes,
 * matched by sourceFile: each one's perennial flag is carried over from
 * whatever's already stored, and anything imported by hand (not one of the
 * bundled files) is left completely untouched. Unlike a blanket "reset to
 * seed," this can't destroy anything the user set locally — recipes are
 * static reference data, and perennial is the only thing they customize on
 * one, so preserving it is the whole safety story. This is deliberately
 * NOT applied to inventory: inventory is a live, constantly-changing
 * ledger, and blindly replacing it with the seed would silently erase real
 * consumption tracked since the seed was last edited. */
export function refreshBundledRecipes(): { recipes: Recipe[]; refreshedCount: number } {
  const existing = loadRecipes();
  const bundled = buildSeedRecipes();
  const bundledSourceFiles = new Set(bundled.map((r) => r.sourceFile));

  const refreshed = bundled.map((fresh) => {
    const previous = existing.find((r) => r.sourceFile === fresh.sourceFile);
    return previous ? { ...fresh, perennial: previous.perennial } : fresh;
  });
  const untouched = existing.filter((r) => !bundledSourceFiles.has(r.sourceFile));

  const recipes = [...refreshed, ...untouched];
  saveRecipes(recipes);
  return { recipes, refreshedCount: refreshed.length };
}
