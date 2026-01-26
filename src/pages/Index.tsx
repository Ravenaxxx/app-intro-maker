import { useState, useCallback, useRef } from "react";
import { Clapperboard, Sparkles, X } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { VideoLibrary } from "@/components/VideoLibrary";
import { AdVideoSection } from "@/components/AdVideoSection";
import { VideoPreviewModal } from "@/components/VideoPreviewModal";
import { ExportProgress } from "@/components/ExportProgress";
import { toast } from "sonner";
import { mergeVideosWithOverlay, downloadBlob } from "@/lib/videoProcessor";

interface Video {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}
const Index = () => {
  const [libraryVideos, setLibraryVideos] = useState<Video[]>([]);
  const [selectedLibraryVideoId, setSelectedLibraryVideoId] = useState<string | null>(null);
  const [adVideo, setAdVideo] = useState<Video | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("");
  const [isAdVideoPlaying, setIsAdVideoPlaying] = useState(false);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const handleLibraryUpload = useCallback((files: File[]) => {
    const newVideos = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setLibraryVideos((prev) => [...prev, ...newVideos]);
    toast.success(`${files.length} vidéo${files.length > 1 ? "s" : ""} ajoutée${files.length > 1 ? "s" : ""} à la bibliothèque`);
  }, []);

  const handleAdVideoUpload = useCallback((files: File[]) => {
    const file = files[0];
    setAdVideo({
      id: crypto.randomUUID(),
      name: file.name,
      url: URL.createObjectURL(file),
    });
    toast.success("Vidéo publicitaire chargée");
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedLibraryVideoId || !adVideo) return;

    const selectedVideo = libraryVideos.find(v => v.id === selectedLibraryVideoId);
    if (!selectedVideo) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      toast.info("Chargement de FFmpeg...", {
        description: "Préparation du traitement vidéo",
      });

      const mergedBlob = await mergeVideosWithOverlay(
        selectedVideo.url,
        adVideo.url,
        "/croix.svg", // SVG will be converted to PNG internally
        (progress, stage) => {
          setExportProgress(progress);
          if (stage) setExportStage(stage);
        }
      );

      downloadBlob(mergedBlob, `fusion-${Date.now()}.mp4`);

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
  }, [selectedLibraryVideoId, adVideo, libraryVideos]);

  const selectedLibraryVideo = libraryVideos.find(
    (v) => v.id === selectedLibraryVideoId
  );
  const canExport = selectedLibraryVideo && adVideo && !isExporting;

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
            title="Vidéo publicitaire"
            description="Uploadez votre vidéo au format publicitaire"
            onUpload={handleAdVideoUpload}
          />
        </section>

        {/* Library Section */}
        <VideoLibrary
          videos={libraryVideos}
          selectedVideoId={selectedLibraryVideoId}
          onSelectVideo={setSelectedLibraryVideoId}
          onPreviewVideo={setPreviewVideo}
          onClearLibrary={() => {
            setLibraryVideos([]);
            setSelectedLibraryVideoId(null);
          }}
        />

        {/* Ad Video Section */}
        <AdVideoSection
          video={adVideo}
          onPreview={() => adVideo && setPreviewVideo(adVideo)}
          onRemove={() => setAdVideo(null)}
        />

        {/* Preview & Export Section */}
        {(selectedLibraryVideo || adVideo) && (
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
                    Vidéo publicitaire
                  </p>
                  <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
                    {adVideo ? (
                      <>
                        <video
                          ref={adVideoRef}
                          src={adVideo.url}
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
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Uploadez une vidéo
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
