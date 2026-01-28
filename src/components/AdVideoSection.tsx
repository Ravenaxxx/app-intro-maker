import { Play, Trash2, Upload, Image } from "lucide-react";

interface AdAsset {
  id: string;
  name: string;
  url: string;
  type: "video" | "image";
}

interface AdVideoSectionProps {
  asset: AdAsset | null;
  onPreview: () => void;
  onRemove: () => void;
}

export const AdVideoSection = ({ asset, onPreview, onRemove }: AdVideoSectionProps) => {
  if (!asset) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            {asset.type === "image" ? (
              <Image className="w-5 h-5 text-primary" />
            ) : (
              <Upload className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {asset.type === "image" ? "Image publicitaire" : "Vidéo publicitaire"}
            </h3>
            <p className="text-sm text-muted-foreground">{asset.name}</p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="relative aspect-video bg-muted rounded-xl overflow-hidden group">
        {asset.type === "video" ? (
          <>
            <video
              src={asset.url}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={onPreview}
                className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors glow-effect"
              >
                <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
              </button>
            </div>
          </>
        ) : (
          <img
            src={asset.url}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </div>
  );
};
