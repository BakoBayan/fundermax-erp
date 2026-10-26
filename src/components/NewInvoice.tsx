'use client';

import React from 'react';
import { PanelTransaction } from '@/types/inventory';
import { openWhatsAppReceipt, openEmailReceipt } from '@/lib/receiptFormatter';

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

export { openWhatsAppReceipt, openEmailReceipt };
