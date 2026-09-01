import { useRef, useState } from "react";
import { Code2, Eye, Trash2, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recordHtmlAd } from "@/lib/htmlAdRecorder";

interface HtmlAdPreviewProps {
  onCaptured?: (asset: { name: string; url: string; type: "video" }) => void;
}

export const HtmlAdPreview = ({ onCaptured }: HtmlAdPreviewProps) => {
  const [code, setCode] = useState("");
  const [rendered, setRendered] = useState("");
  const [duration, setDuration] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [stage, setStage] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);

  const handleRecord = async () => {
    if (!frameRef.current) return;
    setIsRecording(true);
    try {
      const result = await recordHtmlAd(frameRef.current, duration, (_p, s) => {
        if (s) setStage(s);
      });
      const url = URL.createObjectURL(result.blob);
      onCaptured?.({
        name: `creative-html.${result.extension}`,
        url,
        type: "video",
      });
      toast.success("Créa HTML capturée", {
        description: "Elle est désormais utilisée comme asset publicitaire pour l'export.",
      });
    } catch (error) {
      console.error("HTML ad capture failed:", error);
      toast.error("Capture impossible", {
        description: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setIsRecording(false);
      setStage("");
    }
  };

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
            Collez un tag HTML/JS, capturez-le en vidéo puis fusionnez-le avec la vidéo de lancement
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

      <div className="flex flex-wrap items-center gap-3">
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
        <>
          <div
            ref={frameRef}
            className="rounded-xl overflow-hidden border border-border bg-background"
          >
            <iframe
              key={rendered}
              title="Aperçu de l'asset publicitaire HTML"
              sandbox="allow-scripts allow-popups allow-same-origin"
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;font-family:sans-serif}</style></head><body>${rendered}</body></html>`}
              className="w-full h-[400px] bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              Durée de capture
              <input
                type="number"
                min={3}
                max={30}
                value={duration}
                onChange={(e) =>
                  setDuration(Math.min(30, Math.max(3, Number(e.target.value) || 3)))
                }
                className="w-20 rounded-lg bg-muted/40 border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span>s (3–30)</span>
            </label>

            <button
              onClick={handleRecord}
              disabled={isRecording}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              {isRecording ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Video className="w-4 h-4" />
              )}
              {isRecording ? stage || "Capture..." : "Capturer en vidéo et utiliser pour l'export"}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            À la demande d'autorisation, sélectionnez cet onglet : la créa est enregistrée en vidéo,
            puis fusionnée après la vidéo de lancement (croix incluse).
          </p>
        </>
      )}
    </section>
  );
};
