import { Play, Check, Trash2, Pencil } from "lucide-react";
import { useState } from "react";

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
  onDelete?: () => void;
  onRename?: (newName: string) => void;
}

export const VideoCard = ({ video, isSelected, onSelect, onPreview, onDelete, onRename }: VideoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(video.name);

  const handleRename = () => {
    if (editName.trim() && editName !== video.name) {
      onRename?.(editName.trim());
    }
    setIsEditing(false);
  };

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
        <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.();
            }}
            className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors"
          >
            <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-10 h-10 rounded-full bg-destructive/90 flex items-center justify-center hover:bg-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4 text-destructive-foreground" />
            </button>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="p-3 flex items-center gap-2">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setEditName(video.name);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-medium bg-muted border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        ) : (
          <>
            <p className="flex-1 text-sm font-medium text-foreground truncate">{video.name}</p>
            {onRename && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
