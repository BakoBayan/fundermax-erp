export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CompressImageResult {
  base64: string;
  file: File;
  width: number;
  height: number;
}

/**
 * Bulletproof global client-side image compression & normalization utility.
 * Features multi-layered fallbacks to guarantee zero UI crashes in production.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressImageResult> {
  const {
    maxDimension = 1200,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  // Fallback 1: Non-image files (PDFs, docs) bypass canvas safely
  if (!file.type.startsWith('image/')) {
    try {
      const base64 = await readFileAsDataURL(file);
      return { base64, file, width: 0, height: 0 };
    } catch {
      return { base64: '', file, width: 0, height: 0 };
    }
  }

  try {
    const rawDataUrl = await readFileAsDataURL(file);
    
    return await new Promise<CompressImageResult>((resolve) => {
      const img = new Image();
      
      // Fallback 2: If image fails to decode (corrupted file/unsupported format)
      img.onerror = () => {
        resolve({
          base64: rawDataUrl,
          file,
          width: 0,
          height: 0,
        });
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down dimensions safely
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          width = Math.max(1, width);
          height = Math.max(1, height);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64: rawDataUrl, file, width: img.width, height: img.height });
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL(mimeType, quality);

          canvas.toBlob(
            (blob) => {
              const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
              const cleanFileName = file.name.replace(/\.[^/.]+$/, '') + `.${extension}`;
              
              // Fallback 3: If blob creation fails, use the raw file
              const compressedFile = blob
                ? new File([blob], cleanFileName, { type: mimeType, lastModified: Date.now() })
                : file;

              resolve({
                base64,
                file: compressedFile,
                width,
                height,
              });
            },
            mimeType,
            quality
          );
        } catch {
          resolve({ base64: rawDataUrl, file, width: img.width, height: img.height });
        }
      };

      img.src = rawDataUrl;
    });
  } catch {
    // Outer catch ultimate safety net: returns raw file without crashing UI
    return {
      base64: '',
      file,
      width: 0,
      height: 0,
    };
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

export async function compressImages(
  files: FileList | File[],
  options?: CompressImageOptions
): Promise<CompressImageResult[]> {
  const fileArray = Array.from(files);
  const results: CompressImageResult[] = [];
  for (const f of fileArray) {
    try {
      const res = await compressImage(f, options);
      results.push(res);
    } catch (e) {
      console.warn(`[compressImages] Skipped unreadable image (${f.name}):`, e);
    }
  }
  return results;
}
