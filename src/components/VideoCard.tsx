import { Play, Check } from "lucide-react";

interface VideoCardProps {
  video: {
    id: string;
    name: string;
    url: string;
    thumbnail?: string;
  };
  isSelected?: boolean;
  onSelect?: () => void;
  onPreview?: () => void;
}

export const VideoCard = ({ video, isSelected, onSelect, onPreview }: VideoCardProps) => {
  return (
    <div
      className={`video-card rounded-xl overflow-hidden cursor-pointer group ${
        isSelected ? "selected" : ""
      }`}
      onClick={onSelect}
    >
      <div className="relative aspect-video bg-muted">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={video.url}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.();
            }}
            className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors"
          >
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          </button>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate">{video.name}</p>
      </div>
    </div>
  );
};
