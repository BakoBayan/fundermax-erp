'use client';

import React from 'react';
import { PanelTransaction } from '@/types/inventory';
import { openWhatsAppReceipt, openEmailReceipt, formatInvoiceReceipt } from '@/lib/receiptFormatter';

/**
 * Non-blocking WhatsApp dispatch targeting a fresh tab/window so the active session remains untouched.
 */
export function dispatchWhatsAppReceipt(phone: string, message: string): void {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const encodedText = encodeURIComponent(message);
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Non-blocking Email dispatch targeting a fresh tab/window (never window.location.href) so the active session remains untouched.
 */
export function dispatchEmailReceipt(recipientEmail: string, subject: string, body: string): void {
  const mailtoUrl = `mailto:${recipientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (typeof window !== 'undefined') {
    window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
  }
}

export interface InvoiceHistoryProps {
  tx?: PanelTransaction;
  formatMoney?: (val: number, cur?: any) => string;
  lang?: 'ku' | 'en';
}

/**
 * Component providing 1-tap non-blocking WhatsApp and Email receipt actions for invoice history items.
 */
export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({
  tx,
  formatMoney = (val: number) => `$${val.toLocaleString()}`,
  lang = 'ku',
}) => {
  const handleWhatsApp = () => {
    if (!tx) return;
    const { body } = formatInvoiceReceipt(tx, formatMoney, lang);
    const cleanPhone = (tx.clientPhone || (tx as any).phone || '').replace(/\D/g, '');
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(body)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    if (!tx) return;
    const { subject, body } = formatInvoiceReceipt(tx, formatMoney, lang);
    const recipientEmail = (tx as any).clientEmail || (tx as any).email || '';
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleWhatsApp}
        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-2xs"
        title="Share WhatsApp"
      >
        Share WhatsApp
      </button>
      <button
        type="button"
        onClick={handleEmail}
        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-2xs"
        title="Email Receipt"
      >
        Email Receipt
      </button>
    </div>
  );
};

export { openWhatsAppReceipt, openEmailReceipt };
export default InvoiceHistory;
