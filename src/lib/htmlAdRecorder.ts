/**
 * Records an HTML ad creative (rendered inside an iframe) into a video Blob.
 * Uses getDisplayMedia (current tab) + Region Capture to crop to the iframe
 * when available, then MediaRecorder for the requested duration.
 */

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
    // Chrome-only hints to pre-select the current tab
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "exclude",
  } as unknown as MediaStreamConstraints);

  const [track] = stream.getVideoTracks();

  // Crop the capture to the iframe area when Region Capture is available
  try {
    const CT = (window as unknown as { CropTarget?: { fromElement: (el: Element) => Promise<unknown> } }).CropTarget;
    const cropTo = (track as MediaStreamTrack & { cropTo?: (t: unknown) => Promise<void> }).cropTo;
    if (CT && cropTo) {
      const cropTarget = await CT.fromElement(target);
      await cropTo.call(track, cropTarget);
    }
  } catch (e) {
    console.warn("[HtmlAdRecorder] Region capture unavailable:", e);
  }

  const { mime, ext } = pickMimeType();
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 4_000_000,
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
  onProgress?.(100, "Capture terminée");

  return { blob, extension: ext, mimeType: mime };
}
