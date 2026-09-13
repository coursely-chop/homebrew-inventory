import { useEffect } from "react";
import { adoptCloudData, fetchCloudData, getLocalUpdatedAt, pushLocalToCloud } from "./cloudSync";
import { useInventory } from "./InventoryContext";
import { useRecipes } from "./RecipeContext";

/** Once per app load: reconcile local storage against the cloud copy.
 * localStorage is what the app already rendered from (instant, works
 * offline) — this only ever overrides it if the cloud copy is confirmed
 * more current, which is exactly the case that matters: local storage
 * having been wiped out from under the app (the actual failure this sync
 * exists to catch). Otherwise local is pushed up so the cloud stays
 * current too — but only once the cloud has actually been reached.
 * `reachable: false` (sync not configured, offline, a bad response) must
 * never fall into "push local up": a wiped-and-reseeded local copy
 * combined with an unreachable cloud looks identical to a genuinely
 * up-to-date local copy, and pushing in that case would overwrite the
 * last good cloud copy with the empty reseeded one — mirrors a real bug
 * fixed in pt-tracker's version of this same logic. */
export function CloudSyncBoot() {
  const inventory = useInventory();
  const recipes = useRecipes();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cloud = await fetchCloudData();
      if (cancelled || !cloud.reachable) return;
      const localUpdatedAt = getLocalUpdatedAt();
      if (cloud.data && cloud.updatedAt && (!localUpdatedAt || cloud.updatedAt > localUpdatedAt)) {
        adoptCloudData(cloud.data);
        inventory.reload();
        recipes.reload();
      } else {
        pushLocalToCloud();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally run once per mount, not on every inventory/recipes
    // identity change — reload() itself triggers state updates that would
    // otherwise re-trigger this effect.
  }, []);

  return null;
}
