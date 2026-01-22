import { Play, Trash2, Upload } from "lucide-react";

interface AdVideoSectionProps {
  video: {
    id: string;
    name: string;
    url: string;
  } | null;
  onPreview: () => void;
  onRemove: () => void;
}

export const AdVideoSection = ({ video, onPreview, onRemove }: AdVideoSectionProps) => {
  if (!video) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Vidéo publicitaire
            </h3>
            <p className="text-sm text-muted-foreground">{video.name}</p>
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
        <video
          src={video.url}
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
      </div>
    </div>
  );
};
