import { OrderAllocation, PanelTransaction } from '../types/inventory';

/**
 * Workshop orders do not store a phone number. Resolve it from the order itself
 * (if present) or from the most recent sales invoice for the same customer.
 */
export function findCustomerPhone(order: OrderAllocation, transactions: PanelTransaction[]): string {
  const direct = (order.customerPhone || order.clientPhone || order.phone || '').trim();
  if (direct) return direct;
  const name = (order.client || '').trim().toLowerCase();
  if (!name) return '';
  const match = transactions
    .filter((t) => t.isDeleted !== 1 && (t.client || '').trim().toLowerCase() === name && (t.clientPhone || '').trim())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  return match ? (match.clientPhone || '').trim() : '';
}

/** Digits-only international number for wa.me (Iraq default: 07xx -> 9647xx). */
export function toWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.slice(1).replace(/\D/g, '');
  digits = digits.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  return digits;
}

export function buildOrderReadyMessage(isKu: boolean, customerName: string, orderCode: string): string {
  return isKu
    ? `سڵاو بەڕێز ${customerName}، داواکارییەکەت (وەسڵی #${orderCode}) ئامادەیە لە کارگە بۆ وەرگرتنەوە.`
    : `Hello ${customerName}, your order #${orderCode} is ready for pickup at the workshop.`;
}

export function buildOrderReadyWhatsAppUrl(phone: string, isKu: boolean, customerName: string, orderCode: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(buildOrderReadyMessage(isKu, customerName, orderCode))}`;
}
