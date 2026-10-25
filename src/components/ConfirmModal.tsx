'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Trash2, X } from 'lucide-react';

export interface ConfirmDialogOptions {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'success' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ConfirmModalProps {
  dialog?: ConfirmDialogOptions | null;
  isOpen?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  danger?: boolean;
  lang?: 'en' | 'ku';
  isDark?: boolean;
  stepIndicator?: { current: number; total: number };
}

export const ConfirmModal: React.FC<ConfirmModalProps> = (props) => {
  const { dialog, onClose } = props;

  // Determine active props whether passed via `dialog` or individual props
  const isOpen = dialog ? dialog.isOpen : (props.isOpen ?? false);
  const title = dialog ? (dialog.title || 'Confirm Action') : (props.title || 'Confirm Action');
  const message = dialog ? dialog.message : (props.message || '');
  const confirmLabel = dialog ? (dialog.confirmLabel || 'Confirm') : (props.confirmLabel || props.confirmText || 'Confirm');
  const cancelLabel = dialog ? (dialog.cancelLabel || 'Cancel') : (props.cancelLabel || props.cancelText || 'Cancel');
  const onConfirm = dialog ? dialog.onConfirm : (props.onConfirm || (() => {}));
  const onCancel = dialog ? dialog.onCancel : undefined;

  const isDanger =
    (dialog && dialog.type === 'danger') ||
    props.danger ||
    props.isDanger ||
    confirmLabel.toLowerCase().includes('delete');

  const isSuccess =
    (dialog && dialog.type === 'success') ||
    confirmLabel.toLowerCase().includes('finalize');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onCancel]);

  if (!isOpen) return null;

  const handleConfirmAction = () => {
    onConfirm();
    onClose();
  };

  const handleCancelAction = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleCancelAction}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isDanger
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : isSuccess
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-6 h-6" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={handleCancelAction}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-750">
          <button
            type="button"
            onClick={handleCancelAction}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirmAction}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition-all cursor-pointer ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 active:scale-98'
                : isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-98'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 active:scale-98'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
