import imageCompression from "browser-image-compression";

export type CompressPreset = "stay" | "room" | "og" | "branding" | "banner";

const PRESETS: Record<CompressPreset, Parameters<typeof imageCompression>[1]> = {
  stay:     { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true },
  room:     { maxSizeMB: 0.6, maxWidthOrHeight: 1280, useWebWorker: true },
  og:       { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true },
  branding: { maxSizeMB: 0.15, maxWidthOrHeight: 512,  useWebWorker: true },
  banner:   { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true },
};

export async function compressImage(file: File, preset: CompressPreset): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const compressed = await imageCompression(file, PRESETS[preset]);
    return new File([compressed], file.name, { type: compressed.type });
  } catch {
    return file; // fall back to original on error
  }
}
