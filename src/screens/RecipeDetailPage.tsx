import { useNavigate, useParams } from "react-router-dom";
import { useRecipes } from "../lib/RecipeContext";
import { useInventory } from "../lib/InventoryContext";
import { checkFeasibility } from "../lib/recipeIngredients";
import { RecipeDetail } from "../components/RecipeDetail";

export function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, removeRecipe, togglePerennial } = useRecipes();
  const { items } = useInventory();
  const recipe = recipes.find((r) => r.id === id);

  if (!recipe) {
    return (
      <div className="recipes recipe-page">
        <button type="button" className="back-link" onClick={() => navigate("/recipes")}>
          ‹ Recipes
        </button>
        <p className="empty">That recipe isn't here anymore.</p>
      </div>
    );
  }

  const feasibility = checkFeasibility(recipe, items);

  return (
    <div className="recipes recipe-page">
      <button type="button" className="back-link" onClick={() => navigate("/recipes")}>
        ‹ Recipes
      </button>

      <header className="recipe-page-header">
        <button
          type="button"
          className={`star-toggle${recipe.perennial ? " active" : ""}`}
          title={recipe.perennial ? "Perennial — part of the standing rotation" : "Mark as perennial"}
          onClick={() => togglePerennial(recipe.id)}
        >
          {recipe.perennial ? "★" : "☆"}
        </button>
        <div className="recipe-page-title">
          <span className="recipe-name-line">
            <h1>{recipe.name}</h1>
            {feasibility.ready && <span className="badge ready">ready to brew</span>}
          </span>
          <span className="recipe-style">{recipe.styleName}</span>
        </div>
        <button
          type="button"
          className="link danger"
          onClick={() => {
            removeRecipe(recipe.id);
            navigate("/recipes");
          }}
        >
          Delete
        </button>
      </header>

      <RecipeDetail recipe={recipe} />
    </div>
  );
}
