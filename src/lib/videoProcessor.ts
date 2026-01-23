import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg(
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.(Math.round(progress * 100));
  });

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export async function mergeVideosWithOverlay(
  launchVideoUrl: string,
  adVideoUrl: string,
  crossSvgUrl: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ff = await loadFFmpeg(onProgress);

  // Fetch all files
  const launchData = await fetchFile(launchVideoUrl);
  const adData = await fetchFile(adVideoUrl);
  const crossData = await fetchFile(crossSvgUrl);

  // Write input files to FFmpeg virtual filesystem
  await ff.writeFile("launch.mp4", launchData);
  await ff.writeFile("ad.mp4", adData);
  await ff.writeFile("cross.svg", crossData);

  // Step 1: Concatenate the two videos
  // Create a concat file list
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

  // Step 2: Get video info and overlay the cross on the second part (ad video)
  // We'll overlay the cross icon on the entire merged video for simplicity
  // Position: top-right corner with padding
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

  // Read the output file
  const data = await ff.readFile("output.mp4");
  
  // Clean up
  await ff.deleteFile("launch.mp4");
  await ff.deleteFile("ad.mp4");
  await ff.deleteFile("cross.svg");
  await ff.deleteFile("concat.txt");
  await ff.deleteFile("concat.mp4");
  await ff.deleteFile("output.mp4");

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
