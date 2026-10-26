/**
 * Reads an image file and returns a compressed JPEG data URL (max edge `maxDim`).
 * Non-image files (e.g. PDF slips) fall back to the raw data URL.
 */
export function readImageFile(file: File, maxDim = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const raw = String(reader.result || '');
      if (!file.type.startsWith('image/')) {
        resolve(raw);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(raw);
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(raw);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(raw);
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
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
