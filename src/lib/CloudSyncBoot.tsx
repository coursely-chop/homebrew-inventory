import { useEffect } from "react";
import { adoptCloudData, fetchCloudData, getLocalUpdatedAt, pushLocalToCloud } from "./cloudSync";
import { useInventory } from "./InventoryContext";
import { useRecipes } from "./RecipeContext";
import { useShoppingListItems } from "./ShoppingListContext";

/** Reconciles local storage against the cloud copy: on app load, and again
 * whenever the tab regains focus/visibility — catching up a tab that's
 * been open since before a change made on another device, rather than
 * only ever checking once at mount (an already-open tab looks "not
 * syncing" otherwise, since nothing re-checks it). localStorage is what
 * the app already rendered from (instant, works offline) — this only ever
 * overrides it if the cloud copy is confirmed more current, which is
 * exactly the case that matters: local storage having been wiped out from
 * under the app (the actual failure this sync exists to catch), or another
 * device having pushed a newer copy. Otherwise local is pushed up so the
 * cloud stays current too — but only once the cloud has actually been
 * reached. `reachable: false` (sync not configured, offline, a bad
 * response) must never fall into "push local up": a wiped-and-reseeded
 * local copy combined with an unreachable cloud looks identical to a
 * genuinely up-to-date local copy, and pushing in that case would
 * overwrite the last good cloud copy with the empty reseeded one — mirrors
 * a real bug fixed in pt-tracker's version of this same logic. */
export function CloudSyncBoot() {
  const inventory = useInventory();
  const recipes = useRecipes();
  const shoppingListItems = useShoppingListItems();

  useEffect(() => {
    let running = false;

    async function reconcile() {
      if (running) return;
      running = true;
      try {
        const cloud = await fetchCloudData();
        if (!cloud.reachable) return;
        const localUpdatedAt = getLocalUpdatedAt();
        if (cloud.data && cloud.updatedAt && (!localUpdatedAt || cloud.updatedAt > localUpdatedAt)) {
          adoptCloudData(cloud.data);
          inventory.reload();
          recipes.reload();
          shoppingListItems.reload();
        } else {
          pushLocalToCloud();
        }
      } finally {
        running = false;
      }
    }

    void reconcile();

    function handleVisibility() {
      if (document.visibilityState === "visible") void reconcile();
    }
    window.addEventListener("focus", reconcile);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", reconcile);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // Intentionally run once per mount (plus focus/visibility events), not
    // on every inventory/recipes identity change — reload() itself
    // triggers state updates that would otherwise re-trigger this effect.
  }, []);

  return null;
}
