import { compressImage } from './compressImage';

export type MergerInterceptorFn = (files: File[]) => Promise<string | null>;

let activeMergerInterceptor: MergerInterceptorFn | null = null;

/**
 * Registers the global Smart Interceptor callback mounted by InventoryContext / MultiAssetMergerModal.
 */
export function registerMergerInterceptor(fn: MergerInterceptorFn | null) {
  activeMergerInterceptor = fn;
}

/**
 * Checks whether a file is a PDF document by MIME type or extension.
 */
export function isPdfFile(file: File): boolean {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  return /\.pdf$/i.test(file.name || '');
}

/**
 * Extracts image or PDF File objects from a ClipboardEvent's DataTransfer.
 */
export function extractClipboardFiles(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) return [];
  const extracted: File[] = [];

  if (clipboardData.files && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const f = clipboardData.files[i];
      if (f && (f.type.startsWith('image/') || isPdfFile(f))) {
        extracted.push(f);
      }
    }
  }

  if (extracted.length === 0 && clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === 'file' && (item.type.startsWith('image/') || item.type === 'application/pdf')) {
        const blob = item.getAsFile();
        if (blob) {
          const ext = item.type === 'application/pdf' ? 'pdf' : item.type.split('/')[1] || 'png';
          const file =
            blob instanceof File
              ? blob
              : new File([blob], `clipboard_${Date.now()}_${i}.${ext}`, { type: item.type });
          extracted.push(file);
        }
      }
    }
  }

  return extracted;
}

/**
 * Determines whether the Smart Interceptor should intercept a file selection:
 * - Intercepts any image or PDF upload (files.length >= 1), acting as the global image editor across the app.
 */
export function shouldInterceptUpload(files: FileList | File[]): boolean {
  const arr = Array.from(files || []);
  return arr.length >= 1;
}

/**
 * Reads a single image or PDF file, routing through the global MultiAssetMergerModal editor
 * when active, or falling back to standard JPEG compression (<= 150KB).
 */
export async function readImageFile(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  if (activeMergerInterceptor) {
    const merged = await activeMergerInterceptor([file]);
    return merged || '';
  }
  const result = await compressImage(file, {
    maxDimension: maxDim,
    quality,
    mimeType: 'image/jpeg',
    maxSizeKb: 150,
  });
  return result.base64;
}

/**
 * Smart Interceptor file reader:
 * - If files.length === 1 AND the file is an image: compresses to <= 150KB and returns [dataUrl].
 * - If files.length >= 2, OR any file is a PDF, OR a combination of both: intercepts the upload,
 *   auto-opens MultiAssetMergerModal pre-loaded with the selected files array, and resolves with
 *   [mergedDataUrl] when the user clicks "Confirm & Apply" (or [] if cancelled).
 */
export async function readImageFiles(files: FileList | File[]): Promise<string[]> {
  const arr = Array.from(files || []);
  if (arr.length === 0) return [];

  if (shouldInterceptUpload(arr) && activeMergerInterceptor) {
    const mergedDataUrl = await activeMergerInterceptor(arr);
    return mergedDataUrl ? [mergedDataUrl] : [];
  }

  const out: string[] = [];
  for (const f of arr) {
    try {
      const dataUrl = await readImageFile(f);
      if (dataUrl) out.push(dataUrl);
    } catch {
      // skip unreadable file
    }
  }
  return out;
}
