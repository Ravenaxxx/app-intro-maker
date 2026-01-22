import { Download, Loader2 } from "lucide-react";

interface ExportProgressProps {
  progress: number;
  isExporting: boolean;
  onExport: () => void;
  disabled: boolean;
}

export const ExportProgress = ({
  progress,
  isExporting,
  onExport,
  disabled,
}: ExportProgressProps) => {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Export</h3>
      
      {isExporting ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">
              Fusion en cours... {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full progress-bar rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={onExport}
          disabled={disabled}
          className="w-full btn-primary py-3 px-6 rounded-xl flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          <span>Exporter la vidéo fusionnée</span>
        </button>
      )}
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Format de sortie: MP4 compressé
      </p>
    </div>
  );
};
