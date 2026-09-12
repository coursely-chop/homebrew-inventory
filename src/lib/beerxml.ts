import { slugify } from "./slug";
import type { Fermentable, HopAddition, MashStep, MiscAddition, Recipe, YeastAddition } from "../types";

// BeerXML always stores weight/volume/temperature in metric, regardless of
// what the source app displays — Grainfather included. Convert once here so
// the rest of the app can work in the units Ben actually thinks in (lb, oz,
// gal, °F), matching homebrew_inventory.csv and the PRD's own numbers.
function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}
function kgToOz(kg: number): number {
  return kg * 35.27396195;
}
function litersToGal(l: number): number {
  return l * 0.2641720524;
}
function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

function text(el: Element | null, tag: string): string {
  return el?.querySelector(`:scope > ${tag}`)?.textContent?.trim() ?? "";
}
function num(el: Element | null, tag: string): number {
  const t = text(el, tag);
  return t ? parseFloat(t) : 0;
}

/** Parses a BeerXML document (one or more <RECIPE> entries) into this app's
 * Recipe shape. Throws on unparseable input rather than returning a partial
 * result — a silently empty import is worse than a loud failure. */
export function parseBeerXML(xmlText: string, sourceFile: string, existingIds: string[]): Recipe[] {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("That doesn't look like valid XML.");
  }

  const recipeEls = Array.from(doc.querySelectorAll("RECIPES > RECIPE"));
  if (recipeEls.length === 0) {
    throw new Error("No <RECIPE> entries found in this file.");
  }

  const usedIds = [...existingIds];

  return recipeEls.map((r) => {
    const name = text(r, "NAME") || "Untitled Recipe";
    const id = slugify(name, usedIds);
    usedIds.push(id);

    const fermentables: Fermentable[] = Array.from(r.querySelectorAll(":scope > FERMENTABLES > FERMENTABLE")).map(
      (f) => ({
        name: text(f, "NAME"),
        type: text(f, "TYPE"),
        amountLb: kgToLb(num(f, "AMOUNT")),
        yieldPct: num(f, "YIELD"),
        colorLovibond: num(f, "COLOR"),
      })
    );

    const hops: HopAddition[] = Array.from(r.querySelectorAll(":scope > HOPS > HOP")).map((h) => ({
      name: text(h, "NAME"),
      alpha: num(h, "ALPHA"),
      amountOz: kgToOz(num(h, "AMOUNT")),
      use: text(h, "USE"),
      time: num(h, "TIME"),
      form: text(h, "FORM"),
      // Unlike every other temperature in BeerXML, HOP > TEMPERATURE isn't
      // stored in Celsius — Grainfather's exporter writes it in whatever
      // unit the recipe was authored in (here, Fahrenheit already: 185/165,
      // standard hop-stand temps). Converting it again produced 365°F/329°F,
      // so this is taken as-is rather than run through cToF.
      temperatureF: text(h, "TEMPERATURE") ? num(h, "TEMPERATURE") : null,
    }));

    const yeasts: YeastAddition[] = Array.from(r.querySelectorAll(":scope > YEASTS > YEAST")).map((y) => ({
      name: text(y, "NAME"),
      form: text(y, "FORM"),
      displayAmount: text(y, "DISPLAY_AMOUNT"),
      attenuation: num(y, "ATTENUATION"),
    }));

    const miscs: MiscAddition[] = Array.from(r.querySelectorAll(":scope > MISCS > MISC")).map((m) => ({
      name: text(m, "NAME"),
      displayAmount: text(m, "DISPLAY_AMOUNT"),
      time: num(m, "TIME"),
      type: text(m, "TYPE"),
      use: text(m, "USE"),
    }));

    const mashSteps: MashStep[] = Array.from(r.querySelectorAll(":scope > MASH > MASH_STEPS > MASH_STEP")).map(
      (s) => ({
        name: text(s, "NAME"),
        type: text(s, "TYPE"),
        stepTimeMin: num(s, "STEP_TIME"),
        stepTempF: cToF(num(s, "STEP_TEMP")),
        rampTimeMin: num(s, "RAMP_TIME"),
        endTempF: cToF(num(s, "END_TEMP")),
      })
    );

    const recipe: Recipe = {
      id,
      name,
      styleName: text(r.querySelector(":scope > STYLE"), "NAME"),
      batchSizeGal: litersToGal(num(r, "BATCH_SIZE")),
      boilTimeMin: num(r, "BOIL_TIME"),
      efficiencyPct: num(r, "EFFICIENCY"),
      estOG: num(r, "EST_OG"),
      estFG: num(r, "EST_FG"),
      ibu: num(r, "IBU"),
      estABV: num(r, "EST_ABV"),
      estColorSRM: num(r, "EST_COLOR"),
      fermentables,
      hops,
      yeasts,
      miscs,
      mashSteps,
      fermentationStages: num(r, "FERMENTATION_STAGES"),
      primaryAgeDays: num(r, "PRIMARY_AGE"),
      primaryTempF: cToF(num(r, "PRIMARY_TEMP")),
      notes: text(r, "NOTES"),
      sourceFile,
      importedAt: new Date().toISOString(),
    };
    return recipe;
  });
}
