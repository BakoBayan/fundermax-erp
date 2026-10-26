'use client';

import React from 'react';
import { PanelTransaction } from '@/types/inventory';
import { openWhatsAppReceipt, openEmailReceipt, formatInvoiceReceipt } from '@/lib/receiptFormatter';

/**
 * Standard labels and tooltips for Sales Item Builder / New Invoice POS
 */
export const SELLING_PRICE_LABEL_EN = 'Selling Price ($)';
export const SELLING_PRICE_LABEL_KU = 'نرخی فرۆشتن ($)';
export const SELLING_PRICE_LABEL_BILINGUAL = 'Selling Price ($) / نرخی فرۆشتن ($)';

export const OUR_COST_LABEL_EN = 'Our Cost ($)';
export const OUR_COST_LABEL_KU = 'تێچووی لەسەرمان ($)';
export const OUR_COST_LABEL_BILINGUAL = 'Our Cost ($) / تێچووی لەسەرمان ($)';

export const OUR_COST_TOOLTIP = 'Internal wholesale cost for profit tracking (hidden from customer invoice) / تێچووی کڕین بۆ کۆمپانیا';

/**
 * Non-blocking WhatsApp dispatch targeting a fresh tab/window so the current POS screen and draft state remain untouched.
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
 * Non-blocking Email dispatch targeting a fresh tab/window so the current POS screen and draft state remain untouched.
 */
export function dispatchEmailReceipt(recipientEmail: string, subject: string, body: string): void {
  const mailtoUrl = `mailto:${recipientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (typeof window !== 'undefined') {
    window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
  }
}

export interface NewInvoiceProps {
  tx?: PanelTransaction;
  formatMoney?: (val: number, cur?: any) => string;
  lang?: 'ku' | 'en';
}

/**
 * Non-blocking action triggers for New Invoice completions (Share WhatsApp & Email Receipt).
 */
export const NewInvoice: React.FC<NewInvoiceProps> = ({
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
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleWhatsApp}
        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-colors"
        title="Share WhatsApp"
      >
        Share WhatsApp
      </button>
      <button
        type="button"
        onClick={handleEmail}
        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs transition-colors"
        title="Email Receipt"
      >
        Email Receipt
      </button>
    </div>
  );
};

export { openWhatsAppReceipt, openEmailReceipt };
export default NewInvoice;
