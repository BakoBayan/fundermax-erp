'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Trash2, X, Info } from 'lucide-react';

export interface ConfirmDialogOptions {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'success' | 'warning' | 'info';
  hideCancel?: boolean;
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
  hideCancel?: boolean;
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
  const hideCancel = (dialog && dialog.hideCancel) || props.hideCancel;
  const confirmLabel = dialog ? (dialog.confirmLabel || (hideCancel ? 'OK' : 'Confirm')) : (props.confirmLabel || props.confirmText || (hideCancel ? 'OK' : 'Confirm'));
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
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={handleCancelAction}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-850 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 max-h-[85dvh] sm:max-h-none flex flex-col pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Pill Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                isDanger
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : isSuccess
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : (dialog?.type === 'info')
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-6 h-6" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (dialog?.type === 'info') ? (
                <Info className="w-6 h-6" />
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
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-750 shrink-0">
          {!hideCancel && (
            <button
              type="button"
              onClick={handleCancelAction}
              className="min-h-[48px] px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirmAction}
            className={`min-h-[48px] px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 active:scale-98'
                : isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-98'
                : (dialog?.type === 'info')
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 active:scale-98'
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
