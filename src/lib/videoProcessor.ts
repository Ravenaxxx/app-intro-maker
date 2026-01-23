import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let isLoading = false;

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
      // Progress during encoding (60-95% of total)
      const realProgress = 60 + Math.round(progress * 35);
      onProgress?.(Math.min(realProgress, 95), "Encodage vidéo...");
    });

    onProgress?.(5, "Téléchargement de FFmpeg...");

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    
    onProgress?.(10, "Chargement du core FFmpeg...");
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
    
    onProgress?.(20, "Chargement du module WASM...");
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");
    
    onProgress?.(30, "Initialisation de FFmpeg...");
    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

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
  
  // Fetch all files in parallel
  const [launchData, adData, crossData] = await Promise.all([
    fetchFile(launchVideoUrl),
    fetchFile(adVideoUrl),
    fetchFile(crossSvgUrl),
  ]);

  onProgress?.(50, "Écriture des fichiers...");

  // Write input files to FFmpeg virtual filesystem
  await ff.writeFile("launch.mp4", launchData);
  await ff.writeFile("ad.mp4", adData);
  await ff.writeFile("cross.svg", crossData);

  onProgress?.(55, "Concaténation des vidéos...");

  // Step 1: Concatenate the two videos
  await ff.writeFile(
    "concat.txt",
    "file 'launch.mp4'\nfile 'ad.mp4'"
  );

  // Concatenate videos
  await ff.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",
    "-c", "copy",
    "concat.mp4"
  ]);

  onProgress?.(60, "Application de l'overlay...");

  // Step 2: Overlay the cross on the merged video
  await ff.exec([
    "-i", "concat.mp4",
    "-i", "cross.svg",
    "-filter_complex",
    "[1:v]scale=48:48[cross];[0:v][cross]overlay=W-w-20:20",
    "-c:a", "copy",
    "-preset", "fast",
    "-crf", "23",
    "output.mp4"
  ]);

  onProgress?.(95, "Lecture du fichier final...");

  // Read the output file
  const data = await ff.readFile("output.mp4");
  
  onProgress?.(98, "Nettoyage...");
  
  // Clean up
  await ff.deleteFile("launch.mp4");
  await ff.deleteFile("ad.mp4");
  await ff.deleteFile("cross.svg");
  await ff.deleteFile("concat.txt");
  await ff.deleteFile("concat.mp4");
  await ff.deleteFile("output.mp4");

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
