/**
 * Records an HTML ad creative (rendered inside an iframe) into a video Blob.
 * Uses getDisplayMedia (current tab) + Region Capture to crop to the iframe,
 * then re-renders the cropped stream into a canvas at iPhone 12 Pro resolution
 * (1170 x 2532) and records that canvas.
 */

export const IPHONE_12_PRO = {
  cssWidth: 390,
  cssHeight: 844,
  pixelWidth: 1170,
  pixelHeight: 2532,
};

export interface HtmlAdRecordResult {
  blob: Blob;
  extension: string;
  mimeType: string;
}

function pickMimeType(): { mime: string; ext: string } {
  const candidates = [
    { mime: "video/mp4;codecs=avc1", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  throw new Error("Aucun codec vidéo supporté par ce navigateur");
}

export async function recordHtmlAd(
  target: HTMLElement,
  durationSeconds: number,
  onProgress?: (progress: number, stage?: string) => void
): Promise<HtmlAdRecordResult> {
  const md = navigator.mediaDevices as MediaDevices & {
    getDisplayMedia?: (c: unknown) => Promise<MediaStream>;
  };
  if (!md?.getDisplayMedia) {
    throw new Error("La capture d'écran n'est pas supportée par ce navigateur");
  }

  onProgress?.(5, "Autorisation de capture...");

  const stream = await md.getDisplayMedia({
    video: { frameRate: 30 },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "exclude",
  } as unknown as MediaStreamConstraints);

  const [track] = stream.getVideoTracks();

  // Crop the capture to the iframe area when Region Capture is available
  let cropped = false;
  try {
    const CT = (window as unknown as { CropTarget?: { fromElement: (el: Element) => Promise<unknown> } }).CropTarget;
    const cropTo = (track as MediaStreamTrack & { cropTo?: (t: unknown) => Promise<void> }).cropTo;
    if (CT && cropTo) {
      const cropTarget = await CT.fromElement(target);
      await cropTo.call(track, cropTarget);
      cropped = true;
    }
  } catch (e) {
    console.warn("[HtmlAdRecorder] Region capture unavailable:", e);
  }

  // Play the capture into a hidden video element
  const source = document.createElement("video");
  source.srcObject = stream;
  source.muted = true;
  source.playsInline = true;
  await source.play();
  await new Promise<void>((resolve) => {
    if (source.videoWidth) return resolve();
    source.onloadedmetadata = () => resolve();
  });

  // Re-render into a canvas at exact iPhone 12 Pro resolution
  const canvas = document.createElement("canvas");
  canvas.width = IPHONE_12_PRO.pixelWidth;
  canvas.height = IPHONE_12_PRO.pixelHeight;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas indisponible");

  const rect = target.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  const drawFrame = () => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (cropped) {
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback: crop the iframe region out of the full-tab capture
      const scale = source.videoWidth / (window.innerWidth * dpr) || 1;
      const sx = rect.left * dpr * scale;
      const sy = rect.top * dpr * scale;
      const sw = rect.width * dpr * scale;
      const sh = rect.height * dpr * scale;
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }
  };

  const { mime, ext } = pickMimeType();
  const canvasStream = canvas.captureStream(30);
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType: mime,
    videoBitsPerSecond: 6_000_000,
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.onerror = () => reject(new Error("Erreur pendant l'enregistrement"));
  });

  recorder.start(100);
  const start = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      drawFrame();
      const elapsed = (performance.now() - start) / 1000;
      onProgress?.(
        Math.min(95, 10 + (elapsed / durationSeconds) * 85),
        `Capture de la créa (${Math.min(durationSeconds, Math.ceil(elapsed))}/${durationSeconds}s)...`
      );
      if (elapsed >= durationSeconds) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  recorder.stop();
  const blob = await done;
  stream.getTracks().forEach((t) => t.stop());
  canvasStream.getTracks().forEach((t) => t.stop());
  source.srcObject = null;
  onProgress?.(100, "Capture terminée");

  return { blob, extension: ext, mimeType: mime };
}
