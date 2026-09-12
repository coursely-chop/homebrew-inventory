import type { Recipe } from "../types";

const STORAGE_KEY = "homebrew-recipes-data";

export function loadRecipes(): Recipe[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Recipe[]) : [];
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
