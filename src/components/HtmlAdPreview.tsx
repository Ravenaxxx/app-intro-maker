import { useState } from "react";
import { Code2, Eye, Trash2 } from "lucide-react";

export const HtmlAdPreview = () => {
  const [code, setCode] = useState("");
  const [rendered, setRendered] = useState("");

  return (
    <section className="glass-panel rounded-2xl p-6 animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Asset publicitaire via script HTML
          </h3>
          <p className="text-sm text-muted-foreground">
            Collez un tag HTML/JS (ad tag) pour visualiser la créa — aperçu uniquement, non inclus dans l'export
          </p>
        </div>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        placeholder={'<div id="ad"></div>\n<script src="https://..."></script>'}
        className="w-full h-40 rounded-xl bg-muted/40 border border-border p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      <div className="flex gap-3">
        <button
          onClick={() => setRendered(code)}
          disabled={!code.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          <Eye className="w-4 h-4" />
          Afficher l'aperçu
        </button>
        {rendered && (
          <button
            onClick={() => setRendered("")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {rendered && (
        <div className="rounded-xl overflow-hidden border border-border bg-background">
          <iframe
            key={rendered}
            title="Aperçu de l'asset publicitaire HTML"
            sandbox="allow-scripts allow-popups allow-same-origin"
            srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;font-family:sans-serif}</style></head><body>${rendered}</body></html>`}
            className="w-full h-[400px] bg-white"
          />
        </div>
      )}
    </section>
  );
};
