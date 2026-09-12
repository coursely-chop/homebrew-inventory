import { useRef, useState } from "react";
import { useRecipes } from "../lib/RecipeContext";

export function ImportRecipe() {
  const { importBeerXML } = useRecipes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  function handleResult(result: ReturnType<typeof importBeerXML>) {
    if (result.error) {
      setStatus({ kind: "error", message: result.error });
    } else {
      setStatus({ kind: "ok", message: `Imported ${result.imported} recipe${result.imported === 1 ? "" : "s"}.` });
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const xmlText = await file.text();
    handleResult(importBeerXML(xmlText, file.name));
    e.target.value = "";
  }

  function handlePasteImport() {
    if (!pasteText.trim()) return;
    handleResult(importBeerXML(pasteText, "pasted"));
    setPasteText("");
    setPasteOpen(false);
  }

  return (
    <div className="import-recipe">
      <div className="import-actions">
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Import BeerXML file
        </button>
        <button type="button" className="secondary" onClick={() => setPasteOpen((v) => !v)}>
          {pasteOpen ? "Cancel paste" : "Paste XML instead"}
        </button>
        <input ref={fileInputRef} type="file" accept=".xml" hidden onChange={handleFileChange} />
      </div>

      {pasteOpen && (
        <div className="paste-panel">
          <textarea
            placeholder="Paste BeerXML here"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
          />
          <button type="button" onClick={handlePasteImport}>
            Import pasted XML
          </button>
        </div>
      )}

      {status && <p className={`import-status ${status.kind}`}>{status.message}</p>}
    </div>
  );
}
