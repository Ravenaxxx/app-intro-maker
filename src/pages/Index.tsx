import { useState, useCallback, useRef, useEffect } from "react";
import { Clapperboard, Sparkles, X } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { VideoLibrary } from "@/components/VideoLibrary";
import { AdVideoSection } from "@/components/AdVideoSection";
import { ArticleSection } from "@/components/ArticleSection";
import { VideoPreviewModal } from "@/components/VideoPreviewModal";
import { ExportProgress } from "@/components/ExportProgress";
import { toast } from "sonner";
import { mergeVideosNative, downloadBlob } from "@/lib/nativeVideoProcessor";
import {
  saveVideo,
  getAllVideos,
  deleteVideo as deleteVideoFromDB,
  updateVideoName,
  clearAllVideos,
  storedVideoToAppVideo,
  fileToStoredVideo,
} from "@/lib/videoStorage";

interface Video {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

interface AdAsset {
  id: string;
  name: string;
  url: string;
  type: "video" | "image";
}

interface Article {
  url: string;
  title: string;
  markdown: string;
  screenshot?: string;
}
const Index = () => {
  const [libraryVideos, setLibraryVideos] = useState<Video[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedLibraryVideoId, setSelectedLibraryVideoId] = useState<string | null>(null);
  const [adAsset, setAdAsset] = useState<AdAsset | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("");
  const [isAdVideoPlaying, setIsAdVideoPlaying] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const adVideoRef = useRef<HTMLVideoElement>(null);

  // Load videos from IndexedDB on mount
  useEffect(() => {
    const loadVideos = async () => {
      try {
        const storedVideos = await getAllVideos();
        const appVideos = storedVideos.map(storedVideoToAppVideo);
        setLibraryVideos(appVideos);
      } catch (error) {
        console.error("Failed to load videos from storage:", error);
        toast.error("Erreur lors du chargement de la bibliothèque");
      } finally {
        setIsLoadingLibrary(false);
      }
    };
    loadVideos();
  }, []);

  const handleLibraryUpload = useCallback(async (files: File[]) => {
    try {
      const newVideos: Video[] = [];
      for (const file of files) {
        const storedVideo = await fileToStoredVideo(file);
        await saveVideo(storedVideo);
        newVideos.push(storedVideoToAppVideo(storedVideo));
      }
      setLibraryVideos((prev) => [...prev, ...newVideos]);
      toast.success(`${files.length} vidéo${files.length > 1 ? "s" : ""} ajoutée${files.length > 1 ? "s" : ""} à la bibliothèque`);
    } catch (error) {
      console.error("Failed to save videos:", error);
      toast.error("Erreur lors de la sauvegarde des vidéos");
    }
  }, []);

  const handleAdVideoUpload = useCallback((files: File[]) => {
    const file = files[0];
    const isImage = file.type.startsWith("image/");
    setAdAsset({
      id: crypto.randomUUID(),
      name: file.name,
      url: URL.createObjectURL(file),
      type: isImage ? "image" : "video",
    });
    toast.success(isImage ? "Image publicitaire chargée" : "Vidéo publicitaire chargée");
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedLibraryVideoId || !adAsset) return;

    const selectedVideo = libraryVideos.find(v => v.id === selectedLibraryVideoId);
    if (!selectedVideo) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      toast.info("Démarrage de la fusion...", {
        description: "Traitement en cours dans le navigateur",
      });

      const result = await mergeVideosNative(
        selectedVideo.url,
        adAsset.url,
        "/croix.svg",
        adAsset.type,
        (progress, stage) => {
          setExportProgress(progress);
          if (stage) setExportStage(stage);
        }
      );

      downloadBlob(result.blob, `fusion-${Date.now()}.${result.extension}`);

      toast.success("Vidéo exportée avec succès !", {
        description: "La fusion a été réalisée et le fichier est téléchargé.",
      });
    } catch (error) {
      console.error("Export error:", error);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Erreur inconnue";

      toast.error("Erreur lors de l'export", {
        description: message,
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportStage("");
    }
  }, [selectedLibraryVideoId, adAsset, libraryVideos]);

  const selectedLibraryVideo = libraryVideos.find(
    (v) => v.id === selectedLibraryVideoId
  );
  const canExport = selectedLibraryVideo && adAsset && !isExporting;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-effect">
              <Clapperboard className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="gradient-text">VideoFusion</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Fusionnez vos vidéos de lancement avec vos publicités
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Upload Section */}
        <section className="grid md:grid-cols-2 gap-6">
          <UploadZone
            title="Bibliothèque de lancements"
            description="Uploadez vos vidéos de lancement d'app mobile"
            multiple
            onUpload={handleLibraryUpload}
          />
          <UploadZone
            title="Asset publicitaire"
            description="Uploadez une vidéo ou image (.mp4, .png, .jpeg)"
            onUpload={handleAdVideoUpload}
            accept="video/*,image/png,image/jpeg,image/jpg"
          />
        </section>

        {/* Library Section */}
        <VideoLibrary
          videos={libraryVideos}
          selectedVideoId={selectedLibraryVideoId}
          onSelectVideo={setSelectedLibraryVideoId}
          onPreviewVideo={setPreviewVideo}
          onClearLibrary={async () => {
            try {
              await clearAllVideos();
              setLibraryVideos([]);
              setSelectedLibraryVideoId(null);
              toast.success("Bibliothèque vidée");
            } catch (error) {
              console.error("Failed to clear library:", error);
              toast.error("Erreur lors de la suppression");
            }
          }}
          onDeleteVideo={async (id) => {
            try {
              await deleteVideoFromDB(id);
              setLibraryVideos((prev) => prev.filter((v) => v.id !== id));
              if (selectedLibraryVideoId === id) {
                setSelectedLibraryVideoId(null);
              }
            } catch (error) {
              console.error("Failed to delete video:", error);
              toast.error("Erreur lors de la suppression");
            }
          }}
          onRenameVideo={async (id, newName) => {
            try {
              await updateVideoName(id, newName);
              setLibraryVideos((prev) =>
                prev.map((v) => (v.id === id ? { ...v, name: newName } : v))
              );
            } catch (error) {
              console.error("Failed to rename video:", error);
              toast.error("Erreur lors du renommage");
            }
          }}
        />

        {/* Ad Asset Section */}
        <AdVideoSection
          asset={adAsset}
          onPreview={() => adAsset && adAsset.type === "video" && setPreviewVideo({ id: adAsset.id, name: adAsset.name, url: adAsset.url })}
          onRemove={() => setAdAsset(null)}
        />

        {/* Article Search Section */}
        <ArticleSection
          article={selectedArticle}
          onSelectArticle={setSelectedArticle}
          onClearArticle={() => setSelectedArticle(null)}
        />

        {/* Preview & Export Section */}
        {(selectedLibraryVideo || adAsset) && (
          <section className="grid lg:grid-cols-3 gap-6">
            {/* Preview */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Aperçu de la fusion
                </h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Vidéo de lancement
                  </p>
                  <div className="aspect-video bg-muted rounded-xl overflow-hidden">
                    {selectedLibraryVideo ? (
                      <video
                        src={selectedLibraryVideo.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sélectionnez une vidéo
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Asset publicitaire
                  </p>
                  <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
                    {adAsset ? (
                      adAsset.type === "video" ? (
                        <>
                          <video
                            ref={adVideoRef}
                            src={adAsset.url}
                            className="w-full h-full object-cover cursor-pointer"
                            muted
                            playsInline
                            onClick={() => {
                              if (adVideoRef.current) {
                                if (adVideoRef.current.paused) {
                                  adVideoRef.current.play();
                                  setIsAdVideoPlaying(true);
                                } else {
                                  adVideoRef.current.pause();
                                  setIsAdVideoPlaying(false);
                                }
                              }
                            }}
                            onPlay={() => setIsAdVideoPlaying(true)}
                            onPause={() => setIsAdVideoPlaying(false)}
                            onEnded={() => setIsAdVideoPlaying(false)}
                          />
                          {isAdVideoPlaying && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (adVideoRef.current) {
                                  adVideoRef.current.pause();
                                  adVideoRef.current.currentTime = 0;
                                  setIsAdVideoPlaying(false);
                                }
                              }}
                              className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive hover:border-destructive flex items-center justify-center transition-all animate-fade-in"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {!isAdVideoPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded">
                                Cliquez pour lire
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <img
                          src={adAsset.url}
                          alt={adAsset.name}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Uploadez un asset
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Export */}
            <ExportProgress
              progress={exportProgress}
              stage={exportStage}
              isExporting={isExporting}
              onExport={handleExport}
              disabled={!canExport}
            />
          </section>
        )}
      </main>

      {/* Preview Modal */}
      <VideoPreviewModal
        video={previewVideo}
        onClose={() => setPreviewVideo(null)}
      />
    </div>
  );
};

export default Index;
