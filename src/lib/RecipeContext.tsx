import { createContext, useContext, useState, type ReactNode } from "react";
import { parseBeerXML } from "./beerxml";
import { addRecipes, deleteRecipe as deleteRecipeFromStorage, loadRecipes } from "./recipeStorage";
import type { Recipe } from "../types";

export interface ImportResult {
  imported: number;
  error: string | null;
}

interface RecipeContextValue {
  recipes: Recipe[];
  importBeerXML: (xmlText: string, sourceFile: string) => ImportResult;
  removeRecipe: (id: string) => void;
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
      return { imported: parsed.length, error: null };
    } catch (e) {
      return { imported: 0, error: e instanceof Error ? e.message : "Failed to parse file." };
    }
  }

  function removeRecipe(id: string) {
    setRecipes(deleteRecipeFromStorage(id));
  }

  return (
    <RecipeContext.Provider value={{ recipes, importBeerXML, removeRecipe }}>{children}</RecipeContext.Provider>
  );
}

export function useRecipes(): RecipeContextValue {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error("useRecipes must be used within a RecipeProvider");
  return ctx;
}
