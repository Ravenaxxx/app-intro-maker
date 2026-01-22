import { Trash2, Film } from "lucide-react";
import { VideoCard } from "./VideoCard";

interface Video {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

interface VideoLibraryProps {
  videos: Video[];
  selectedVideoId: string | null;
  onSelectVideo: (id: string) => void;
  onPreviewVideo: (video: Video) => void;
  onClearLibrary: () => void;
}

export const VideoLibrary = ({
  videos,
  selectedVideoId,
  onSelectVideo,
  onPreviewVideo,
  onClearLibrary,
}: VideoLibraryProps) => {
  if (videos.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Film className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Bibliothèque de lancements
            </h3>
            <p className="text-sm text-muted-foreground">
              {videos.length} vidéo{videos.length > 1 ? "s" : ""} • Sélectionnez une vidéo
            </p>
          </div>
        </div>
        <button
          onClick={onClearLibrary}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Vider la bibliothèque"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            isSelected={selectedVideoId === video.id}
            onSelect={() => onSelectVideo(video.id)}
            onPreview={() => onPreviewVideo(video)}
          />
        ))}
      </div>
    </div>
  );
};
