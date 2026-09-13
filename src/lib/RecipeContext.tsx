import { createContext, useContext, useState, type ReactNode } from "react";
import { parseBeerXML } from "./beerxml";
import { addRecipes, deleteRecipe as deleteRecipeFromStorage, loadRecipes, updateRecipe } from "./recipeStorage";
import { pushLocalToCloud } from "./cloudSync";
import type { Recipe } from "../types";

export interface ImportResult {
  imported: number;
  error: string | null;
}

interface RecipeContextValue {
  recipes: Recipe[];
  importBeerXML: (xmlText: string, sourceFile: string) => ImportResult;
  removeRecipe: (id: string) => void;
  togglePerennial: (id: string) => void;
  /** Re-reads localStorage into state — used by the cloud-sync
   * reconciliation when the cloud copy wins on load. */
  reload: () => void;
}

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>(() => loadRecipes());

  function importBeerXML(xmlText: string, sourceFile: string): ImportResult {
    try {
      const parsed = parseBeerXML(
        xmlText,
        sourceFile,
        recipes.map((r) => r.id)
      );
      setRecipes(addRecipes(parsed));
      pushLocalToCloud();
      return { imported: parsed.length, error: null };
    } catch (e) {
      return { imported: 0, error: e instanceof Error ? e.message : "Failed to parse file." };
    }
  }

  function removeRecipe(id: string) {
    setRecipes(deleteRecipeFromStorage(id));
    pushLocalToCloud();
  }

  function togglePerennial(id: string) {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    setRecipes(updateRecipe({ ...recipe, perennial: !recipe.perennial }));
    pushLocalToCloud();
  }

  function reload() {
    setRecipes(loadRecipes());
  }

  return (
    <RecipeContext.Provider value={{ recipes, importBeerXML, removeRecipe, togglePerennial, reload }}>
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipes(): RecipeContextValue {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error("useRecipes must be used within a RecipeProvider");
  return ctx;
}
