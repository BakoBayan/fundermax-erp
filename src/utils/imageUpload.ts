import { compressImage } from './compressImage';

/**
 * Reads an image file and returns a compressed JPEG data URL (max edge `maxDim`).
 * Non-image files (e.g. PDF slips) fall back to the raw data URL.
 */
export async function readImageFile(file: File, maxDim = 1200, quality = 0.8): Promise<string> {
  const result = await compressImage(file, { maxDimension: maxDim, quality, mimeType: 'image/jpeg' });
  return result.base64;
}

/** Reads many files in order, skipping any that fail. */
export async function readImageFiles(files: FileList | File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of Array.from(files)) {
    try {
      out.push(await readImageFile(f));
    } catch {
      // skip unreadable file
    }
  }
  return out;
}
