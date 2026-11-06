import { compressImage, CompressionProfile } from './compressImage';

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
 * when active, or falling back to dual-tier compression ('warehouse' or 'document').
 */
export async function readImageFile(
  file: File,
  profile?: CompressionProfile,
  maxDim?: number,
  quality?: number
): Promise<string> {
  if (activeMergerInterceptor) {
    const merged = await activeMergerInterceptor([file]);
    return merged || '';
  }
  const result = await compressImage(file, {
    profile: profile || 'warehouse',
    maxDimension: maxDim,
    quality,
    mimeType: 'image/jpeg',
  });
  return result.base64;
}

/**
 * Smart Interceptor file reader:
 * - If Smart Interceptor is active: auto-opens MultiAssetMergerModal and resolves with merged JPEG.
 * - Fallback: processes files individually through compressImage using the specified profile ('warehouse' | 'document').
 */
export async function readImageFiles(
  files: FileList | File[],
  profile?: CompressionProfile
): Promise<string[]> {
  const arr = Array.from(files || []);
  if (arr.length === 0) return [];

  if (shouldInterceptUpload(arr) && activeMergerInterceptor) {
    const mergedDataUrl = await activeMergerInterceptor(arr);
    return mergedDataUrl ? [mergedDataUrl] : [];
  }

  const out: string[] = [];
  for (const f of arr) {
    try {
      const dataUrl = await readImageFile(f, profile);
      if (dataUrl) out.push(dataUrl);
    } catch (e) {
      if (e instanceof Error && e.message.includes('File too large')) {
        throw e;
      }
      // skip unreadable file
    }
  }
  return out;
}
