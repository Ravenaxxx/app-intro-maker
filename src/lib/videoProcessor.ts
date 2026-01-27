import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let isLoading = false;

// Convert SVG to PNG using canvas
async function svgToPng(svgUrl: string, size: number = 68): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, size, size);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not convert to blob"));
          return;
        }
        
        blob.arrayBuffer().then((buffer) => {
          resolve(new Uint8Array(buffer));
        });
      }, "image/png");
    };
    
    img.onerror = () => reject(new Error("Failed to load SVG"));
    img.src = svgUrl;
  });
}

export async function loadFFmpeg(
  onProgress?: (progress: number, stage: string) => void
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;
  
  if (isLoading) {
    // Wait for the existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpeg && ffmpeg.loaded) return ffmpeg;
  }

  isLoading = true;
  
  try {
    ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    ffmpeg.on("progress", ({ progress, time }) => {
      console.log("[FFmpeg Progress]", progress, time);
    });

    onProgress?.(5, "Téléchargement de FFmpeg...");

    // Use the UMD build.
    // Note: Some environments intermittently fail with unpkg ("failed to import ffmpeg-core.js").
    // jsDelivr is generally more reliable for worker/wasm delivery.
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
    
    onProgress?.(10, "Chargement du core FFmpeg...");
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");

    // In UMD, the worker exists; passing it avoids hangs during init in some browsers.
    onProgress?.(15, "Chargement du worker FFmpeg...");
    const workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript");
    
    onProgress?.(20, "Chargement du module WASM...");
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");
    
    onProgress?.(30, "Initialisation de FFmpeg...");

    // If load hangs, we want an explicit error rather than an infinite 30% state.
    const LOAD_TIMEOUT_MS = 60_000;
    const loadWithTimeout = (opts: { coreURL: string; wasmURL: string; workerURL?: string }) =>
      Promise.race([
        ffmpeg!.load(opts),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("FFmpeg init timeout (60s).")),
            LOAD_TIMEOUT_MS
          )
        ),
      ]);

    // Primary attempt: load with explicit worker URL.
    // Fallback: some browsers/CDN combinations behave better without passing workerURL.
    try {
      await loadWithTimeout({ coreURL, wasmURL, workerURL });
    } catch (e) {
      console.warn("[FFmpeg] load() failed with workerURL, retrying without workerURL", e);
      onProgress?.(31, "Retry sans worker...");
      await loadWithTimeout({ coreURL, wasmURL });
    }

    onProgress?.(35, "FFmpeg prêt");
    return ffmpeg;
  } finally {
    isLoading = false;
  }
}

export async function mergeVideosWithOverlay(
  launchVideoUrl: string,
  adVideoUrl: string,
  crossSvgUrl: string,
  onProgress?: (progress: number, stage?: string) => void
): Promise<Blob> {
  const ff = await loadFFmpeg(onProgress);

  onProgress?.(40, "Chargement des fichiers vidéo...");
  
  // Fetch video files and convert SVG to PNG
  const [launchData, adData, crossPngData] = await Promise.all([
    fetchFile(launchVideoUrl),
    fetchFile(adVideoUrl),
    svgToPng(crossSvgUrl, 68),
  ]);

  onProgress?.(50, "Écriture des fichiers...");

  // Write input files to FFmpeg virtual filesystem
  await ff.writeFile("launch.mp4", launchData);
  await ff.writeFile("ad.mp4", adData);
  await ff.writeFile("cross.png", crossPngData);

  onProgress?.(55, "Normalisation des vidéos...");

  // Step 1: Re-encode both videos to ensure same format/resolution for clean concat
  // Get the first video normalized
  await ff.exec([
    "-i", "launch.mp4",
    "-vf", "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,fps=30",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-y",
    "launch_norm.mp4"
  ]);

  onProgress?.(65, "Normalisation de la 2ème vidéo...");

  // Normalize second video
  await ff.exec([
    "-i", "ad.mp4",
    "-vf", "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,fps=30",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-y",
    "ad_norm.mp4"
  ]);

  onProgress?.(75, "Concaténation des vidéos...");

  // Step 2: Concatenate using concat filter (more reliable than demuxer)
  await ff.exec([
    "-i", "launch_norm.mp4",
    "-i", "ad_norm.mp4",
    "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]",
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-y",
    "concat.mp4"
  ]);

  onProgress?.(85, "Application de l'overlay...");

  // Step 3: Overlay the cross PNG on the merged video
  await ff.exec([
    "-i", "concat.mp4",
    "-i", "cross.png",
    "-filter_complex", "[1:v]scale=48:48[cross];[0:v][cross]overlay=W-w-20:20[outv]",
    "-map", "[outv]",
    "-map", "0:a",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "copy",
    "-y",
    "output.mp4"
  ]);

  onProgress?.(95, "Lecture du fichier final...");

  // Read the output file
  const data = await ff.readFile("output.mp4");
  
  onProgress?.(98, "Nettoyage...");
  
  // Clean up all files
  const filesToDelete = [
    "launch.mp4", "ad.mp4", "cross.png",
    "launch_norm.mp4", "ad_norm.mp4",
    "concat.mp4", "output.mp4"
  ];
  
  for (const file of filesToDelete) {
    try {
      await ff.deleteFile(file);
    } catch {
      // Ignore cleanup errors
    }
  }

  onProgress?.(100, "Terminé !");

  // Convert FileData to ArrayBuffer for Blob compatibility
  let arrayBuffer: ArrayBuffer;
  if (typeof data === "string") {
    arrayBuffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
  } else {
    // Copy the data to a new ArrayBuffer to avoid SharedArrayBuffer issues
    arrayBuffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(arrayBuffer).set(data);
  }

  return new Blob([arrayBuffer], { type: "video/mp4" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
