/**
 * Native browser video processor using Canvas + MediaRecorder
 * No FFmpeg dependency - uses browser-native APIs only
 * Output format: WebM (VP8/Opus)
 */

export interface VideoProcessorProgress {
  progress: number;
  stage: string;
}

// Load a video element and wait for it to be ready
async function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onloadedmetadata = () => {
      video.oncanplaythrough = () => resolve(video);
    };
    
    video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
    video.src = url;
    video.load();
  });
}

// Load an image (for the cross overlay)
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

// Draw a single frame to canvas with optional overlay
function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  overlayImg?: HTMLImageElement
) {
  // Clear canvas
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Calculate scaling to fit video in canvas while maintaining aspect ratio
  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

  if (videoAspect > canvasAspect) {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / videoAspect;
    offsetX = 0;
    offsetY = (canvasHeight - drawHeight) / 2;
  } else {
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * videoAspect;
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  }

  ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

  // Draw overlay in top-right corner
  if (overlayImg) {
    const overlaySize = 48;
    const margin = 20;
    ctx.drawImage(
      overlayImg,
      canvasWidth - overlaySize - margin,
      margin,
      overlaySize,
      overlaySize
    );
  }
}

// Process a single video and record to MediaRecorder
async function processVideoSegment(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  overlayImg: HTMLImageElement,
  onFrame: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    video.currentTime = 0;
    
    const frameRate = 30;
    const frameDuration = 1000 / frameRate;
    let animationId: number;
    let lastFrameTime = 0;

    const renderLoop = (timestamp: number) => {
      if (video.ended || video.paused) {
        cancelAnimationFrame(animationId);
        resolve();
        return;
      }

      // Throttle to target frame rate
      if (timestamp - lastFrameTime >= frameDuration) {
        drawFrame(ctx, video, canvasWidth, canvasHeight, overlayImg);
        onFrame();
        lastFrameTime = timestamp;
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    video.onended = () => {
      cancelAnimationFrame(animationId);
      resolve();
    };

    video.onerror = () => {
      cancelAnimationFrame(animationId);
      reject(new Error("Video playback error"));
    };

    video.play()
      .then(() => {
        animationId = requestAnimationFrame(renderLoop);
      })
      .catch(reject);
  });
}

export interface MergeResult {
  blob: Blob;
  extension: string;
}

export async function mergeVideosNative(
  launchVideoUrl: string,
  adVideoUrl: string,
  crossSvgUrl: string,
  onProgress?: (progress: number, stage?: string) => void
): Promise<MergeResult> {
  onProgress?.(5, "Chargement des vidéos...");

  // Load all resources in parallel
  const [launchVideo, adVideo, crossImg] = await Promise.all([
    loadVideo(launchVideoUrl),
    loadVideo(adVideoUrl),
    loadImage(crossSvgUrl),
  ]);

  onProgress?.(20, "Préparation du canvas...");

  // Create canvas for rendering - use 720x1280 for vertical video
  const canvasWidth = 720;
  const canvasHeight = 1280;
  
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  onProgress?.(25, "Configuration de l'enregistrement...");

  // Get canvas stream and set up MediaRecorder
  const stream = canvas.captureStream(30);

  // Try to add audio from videos
  try {
    // Create audio context for mixing
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // We'll capture audio from each video as it plays
    const launchAudioSource = audioContext.createMediaElementSource(launchVideo);
    const adAudioSource = audioContext.createMediaElementSource(adVideo);

    // Connect to destination (but don't play yet)
    launchAudioSource.connect(destination);
    adAudioSource.connect(destination);

    // Also connect to speakers so we can hear (optional - muted for processing)
    launchAudioSource.connect(audioContext.destination);
    adAudioSource.connect(audioContext.destination);

    // Add audio track to stream
    const audioTracks = destination.stream.getAudioTracks();
    audioTracks.forEach(track => stream.addTrack(track));
  } catch (e) {
    console.warn("Could not set up audio mixing, video will be silent:", e);
  }

  // Set up MediaRecorder - try MP4 first, fallback to WebM
  const mimeTypes = [
    { mime: "video/mp4;codecs=avc1,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];

  let selectedMimeType = "";
  let selectedExtension = "webm";
  for (const { mime, ext } of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMimeType = mime;
      selectedExtension = ext;
      break;
    }
  }

  if (!selectedMimeType) {
    throw new Error("No supported video codec found in this browser");
  }

  console.log("[NativeProcessor] Using codec:", selectedMimeType, "extension:", selectedExtension);

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 4_000_000, // 4 Mbps for good quality
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Start recording
  recorder.start(100); // Get data every 100ms

  // Calculate total duration for progress
  const totalDuration = launchVideo.duration + adVideo.duration;
  let processedDuration = 0;

  const updateProgress = (currentVideo: HTMLVideoElement, baseProgress: number) => {
    processedDuration = baseProgress + currentVideo.currentTime;
    const percent = 30 + (processedDuration / totalDuration) * 60;
    onProgress?.(Math.min(90, percent), "Fusion en cours...");
  };

  onProgress?.(30, "Enregistrement de la 1ère vidéo...");

  // Process first video (without cross overlay)
  launchVideo.muted = false;
  await processVideoSegment(
    launchVideo,
    ctx,
    canvasWidth,
    canvasHeight,
    undefined, // No overlay on launch video
    () => updateProgress(launchVideo, 0)
  );
  launchVideo.muted = true;

  onProgress?.(60, "Enregistrement de la 2ème vidéo...");

  // Process second video
  adVideo.muted = false;
  await processVideoSegment(
    adVideo,
    ctx,
    canvasWidth,
    canvasHeight,
    crossImg,
    () => updateProgress(adVideo, launchVideo.duration)
  );
  adVideo.muted = true;

  onProgress?.(92, "Finalisation...");

  // Stop recording and get final blob
  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: selectedMimeType });
      onProgress?.(100, "Terminé !");
      resolve({ blob: finalBlob, extension: selectedExtension });
    };

    recorder.onerror = (e) => {
      reject(new Error(`Recording error: ${e}`));
    };

    // Small delay to ensure last frames are captured
    setTimeout(() => {
      recorder.stop();
    }, 200);
  });
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
