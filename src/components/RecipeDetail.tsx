import { useState } from "react";
import type { Recipe } from "../types";
import { formatMinutes, round } from "../lib/format";
import { buildIngredientRows, checkFeasibility } from "../lib/recipeIngredients";
import { useInventory } from "../lib/InventoryContext";
import { DeductPanel } from "./DeductPanel";

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const { items } = useInventory();
  const feasibility = checkFeasibility(recipe, items);
  const shortItemIds = new Set(feasibility.short.map((s) => s.itemId));
  const rows = buildIngredientRows(recipe, items);
  const [deducting, setDeducting] = useState(false);

  function isShort(key: string): boolean {
    const row = rows.find((r) => r.key === key);
    return !!row?.matchedItemId && shortItemIds.has(row.matchedItemId);
  }

  return (
    <div className="recipe-detail">
      <div className="recipe-stats">
        <Stat label="Batch" value={`${round(recipe.batchSizeGal, 2)} gal`} />
        <Stat label="OG" value={recipe.estOG.toFixed(3)} />
        <Stat label="FG" value={recipe.estFG.toFixed(3)} />
        <Stat label="ABV" value={`${round(recipe.estABV, 1)}%`} />
        <Stat label="IBU" value={round(recipe.ibu, 0).toString()} />
        <Stat label="Color" value={`${round(recipe.estColorSRM, 1)} SRM`} />
        <Stat label="Efficiency" value={`${round(recipe.efficiencyPct, 0)}%`} />
        <Stat label="Boil" value={`${recipe.boilTimeMin} min`} />
      </div>

      <div className="recipe-actions">
        {feasibility.ready ? (
          <button type="button" onClick={() => setDeducting(true)}>
            Brew this — deduct inventory
          </button>
        ) : (
          <p className="recipe-not-ready">
            Not ready to brew as written — short on {feasibility.short.map((s) => s.name).join(", ")}. Clone this
            recipe with what you actually end up using, then deduct from that instead.
          </p>
        )}
      </div>
      {deducting && <DeductPanel recipe={recipe} onClose={() => setDeducting(false)} />}

      <section>
        <h3>Fermentables</h3>
        <table>
          <tbody>
            {recipe.fermentables.map((f, i) => (
              <tr key={i} className={isShort(`f${i}`) ? "short-row" : ""}>
                <td>{isShort(`f${i}`) && "‼️ "}{f.name}</td>
                <td className="num">{round(f.amountLb, 2)} lb</td>
                <td className="dim">{f.type}</td>
                <td className="dim">{round(f.colorLovibond, 1)}°L</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Hops</h3>
        <table>
          <tbody>
            {recipe.hops.map((h, i) => (
              <tr key={i} className={isShort(`h${i}`) ? "short-row" : ""}>
                <td>{isShort(`h${i}`) && "‼️ "}{h.name}</td>
                <td className="num">{round(h.amountOz, 2)} oz</td>
                <td className="dim">{h.use}</td>
                <td className="dim">
                  {formatMinutes(h.time)}
                  {h.temperatureF ? ` @ ${round(h.temperatureF, 0)}°F` : ""}
                </td>
                <td className="dim">{h.alpha}% AA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Yeast</h3>
        <table>
          <tbody>
            {recipe.yeasts.map((y, i) => (
              <tr key={i} className={isShort(`y${i}`) ? "short-row" : ""}>
                <td>{isShort(`y${i}`) && "‼️ "}{y.name}</td>
                <td className="num">{y.displayAmount}</td>
                <td className="dim">{y.form}</td>
                <td className="dim">{y.attenuation}% attenuation</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {recipe.miscs.length > 0 && (
        <section>
          <h3>Water / Misc</h3>
          <table>
            <tbody>
              {recipe.miscs.map((m, i) => (
                <tr key={i}>
                  <td>{m.name}</td>
                  <td className="num">{m.displayAmount}</td>
                  <td className="dim">{m.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h3>Mash</h3>
        <table>
          <tbody>
            {recipe.mashSteps.map((s, i) => (
              <tr key={i}>
                <td>{s.name}</td>
                <td className="num">{round(s.stepTempF, 0)}°F</td>
                <td className="dim">{s.stepTimeMin} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Fermentation</h3>
        <p className="ferm-summary">
          {recipe.fermentationStages} stage{recipe.fermentationStages === 1 ? "" : "s"} · primary{" "}
          {recipe.primaryAgeDays}d @ {round(recipe.primaryTempF, 0)}°F
        </p>
      </section>

      {recipe.notes && (
        <section>
          <h3>Notes</h3>
          <p>{recipe.notes}</p>
        </section>
      )}

      <p className="recipe-source">Imported from {recipe.sourceFile}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
