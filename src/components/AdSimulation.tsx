import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface AdSimulationProps {
  article: Article;
  adAsset: AdAsset;
}

const AD_IMAGE_DURATION = 5000; // 5 seconds for image ads

export const AdSimulation = ({ article, adAsset }: AdSimulationProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAd, setShowAd] = useState(true);
  const [adProgress, setAdProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setShowAd(true);
    setAdProgress(0);

    if (adAsset.type === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    } else if (adAsset.type === "image") {
      // Start progress tracking for image
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / AD_IMAGE_DURATION) * 100, 100);
        setAdProgress(progress);
      }, 50);

      // Hide ad after duration
      imageTimerRef.current = setTimeout(() => {
        setShowAd(false);
        setIsPlaying(false);
        setAdProgress(100);
        clearTimers();
      }, AD_IMAGE_DURATION);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (adAsset.type === "video" && videoRef.current) {
      videoRef.current.pause();
    }
    clearTimers();
  };

  const handleReset = () => {
    setIsPlaying(false);
    setShowAd(true);
    setAdProgress(0);
    clearTimers();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  };

  const handleCloseAd = () => {
    setShowAd(false);
    setIsPlaying(false);
    clearTimers();
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setAdProgress(progress);
    }
  };

  const handleVideoEnded = () => {
    setShowAd(false);
    setIsPlaying(false);
    setAdProgress(100);
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Reset when assets change
  useEffect(() => {
    handleReset();
  }, [article, adAsset]);

  if (!article.screenshot) {
    return (
      <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Aucun screenshot disponible pour cet article
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simulation Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
        {/* Article Screenshot Background */}
        <img
          src={`data:image/png;base64,${article.screenshot}`}
          alt={article.title}
          className="w-full h-full object-cover object-top"
        />

        {/* Ad Overlay */}
        {showAd && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 animate-fade-in">
            <div className="relative w-[70%] max-w-md aspect-video rounded-lg overflow-hidden shadow-2xl border border-white/20">
              {/* Close Button */}
              <button
                onClick={handleCloseAd}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                title="Fermer la pub"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              {/* Ad Content */}
              {adAsset.type === "video" ? (
                <video
                  ref={videoRef}
                  src={adAsset.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                />
              ) : (
                <img
                  src={adAsset.url}
                  alt={adAsset.name}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${adProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Play Button Overlay (when not playing and ad hidden) */}
        {!isPlaying && !showAd && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Button
              onClick={handleReset}
              variant="secondary"
              size="lg"
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Rejouer la simulation
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {showAd ? (
          <>
            {isPlaying ? (
              <Button onClick={handlePause} variant="outline" size="sm">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button onClick={handlePlay} variant="default" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Lancer la simulation
              </Button>
            )}
            <Button onClick={handleReset} variant="ghost" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </>
        ) : (
          <Button onClick={handleReset} variant="default" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Rejouer
          </Button>
        )}
      </div>
    </div>
  );
};
