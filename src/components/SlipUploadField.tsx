'use client';

import React, { useState, useEffect } from 'react';
import { Paperclip, X } from 'lucide-react';
import { readImageFiles, extractClipboardFiles } from '../utils/imageUpload';
import { useInventory } from '../context/InventoryContext';

interface SlipUploadFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  isKu?: boolean;
  id: string;
}

/** Slip & Hawala photo picker with thumbnails, multi-file interceptor, and global paste support. */
export const SlipUploadField: React.FC<SlipUploadFieldProps> = ({ images, onChange, isKu, id }) => {
  const [busy, setBusy] = useState(false);
  const { isMergerModalOpen, openMergerModal } = useInventory();

  const processSelectedFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    setBusy(true);
    try {
      const added = await readImageFiles(selectedFiles);
      if (added.length > 0) {
        onChange([...images, ...added]);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isMergerModalOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const pastedFiles = extractClipboardFiles(e.clipboardData);
      if (pastedFiles.length === 0) return;
      e.preventDefault();
      openMergerModal(pastedFiles, (mergedDataUrl) => {
        if (mergedDataUrl) {
          onChange([...images, mergedDataUrl]);
        }
      });
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isMergerModalOpen, openMergerModal, images, onChange]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);
    e.target.value = '';
    await processSelectedFiles(selectedFiles);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          void processSelectedFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 cursor-pointer"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {isKu ? 'هاوپێچ / Slip & Hawala Photo' : 'Slip & Hawala Photo / هاوپێچ'}
        {busy && <span className="text-slate-400 font-normal">…</span>}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*,application/pdf,.pdf"
        multiple
        onChange={handleFiles}
        className="block w-full text-xs text-slate-600 dark:text-slate-300 file:me-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-700 file:font-bold file:cursor-pointer"
      />
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((src, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Slip" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== idx))}
                className="absolute top-0 end-0 bg-black/60 text-white rounded-es-lg p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
