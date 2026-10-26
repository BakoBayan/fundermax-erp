'use client';

import React from 'react';
import { PanelTransaction } from '@/types/inventory';
import { openWhatsAppReceipt, openEmailReceipt } from '@/lib/receiptFormatter';

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

export { openWhatsAppReceipt, openEmailReceipt };
