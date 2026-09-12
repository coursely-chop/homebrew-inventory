import substantialXml from "../data/recipes/substantial-02.xml?raw";
import hangerXml from "../data/recipes/hanger.xml?raw";
import nzPilsXml from "../data/recipes/nz-pils.xml?raw";
import { parseBeerXML } from "./beerxml";
import type { Recipe } from "../types";

const STORAGE_KEY = "homebrew-recipes-data";

// Grainfather recipes pulled in at launch via BeerXML export (see PRD: no
// public API, so this is the realistic import path). Seeded once into
// localStorage on first load, same as the inventory baseline — after that,
// further imports go through the in-app importer.
const SEED_RECIPES: { xml: string; sourceFile: string }[] = [
  { xml: substantialXml, sourceFile: "substantial-02.xml" },
  { xml: hangerXml, sourceFile: "hanger.xml" },
  { xml: nzPilsXml, sourceFile: "nz-pils.xml" },
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
