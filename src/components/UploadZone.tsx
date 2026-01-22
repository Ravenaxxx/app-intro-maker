import { Upload, Film, X } from "lucide-react";
import { useCallback, useState } from "react";

interface UploadZoneProps {
  title: string;
  description: string;
  multiple?: boolean;
  onUpload: (files: File[]) => void;
  accept?: string;
}

export const UploadZone = ({
  title,
  description,
  multiple = false,
  onUpload,
  accept = "video/*",
}: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("video/")
      );
      if (files.length > 0) {
        onUpload(multiple ? files : [files[0]]);
      }
    },
    [onUpload, multiple]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onUpload(multiple ? files : [files[0]]);
      }
    },
    [onUpload, multiple]
  );

  return (
    <div
      className={`upload-zone rounded-2xl p-8 text-center transition-all ${
        isDragging ? "border-primary bg-primary/5" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        id={`upload-${title.replace(/\s/g, "-")}`}
      />
      <label
        htmlFor={`upload-${title.replace(/\s/g, "-")}`}
        className="cursor-pointer flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          {multiple ? (
            <Film className="w-8 h-8 text-primary" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          Glisser-déposer ou cliquer pour sélectionner
        </span>
      </label>
    </div>
  );
};
