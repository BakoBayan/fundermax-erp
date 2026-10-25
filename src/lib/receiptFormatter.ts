import { PanelTransaction } from '@/types/inventory';

export interface ReceiptTextResult {
  subject: string;
  body: string;
  whatsAppUrl: string;
  mailtoUrl: string;
}

/**
 * Unified bilingual receipt generator supporting Kurdish (ku) and English (en).
 */
export function formatInvoiceReceipt(
  tx: PanelTransaction,
  formatMoney: (val: number, cur?: any) => string,
  lang: 'ku' | 'en' = 'ku'
): ReceiptTextResult {
  const txCur = tx.currency || tx.chargedCurrency || 'USD';
  const invoiceNum = tx.code || (tx.id ? `INV-${tx.id.slice(-6)}` : 'INV-001');
  const dateFormatted = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : new Date().toLocaleDateString();
  const clientName = (tx as any).client || tx.seller || (lang === 'ku' ? 'کڕیاری گشتی' : 'Valued Customer');
  const invoiceTotal = tx.totalAfterDiscount !== undefined ? tx.totalAfterDiscount : tx.sellingAmount;
  const totalDebt = tx.combinedTotalDebt !== undefined ? tx.combinedTotalDebt : (tx.amountOwed || 0);
  const paidNow = tx.amountPaidNow || 0;

  if (lang === 'ku') {
    const itemsList = (tx.items && tx.items.length > 0)
      ? tx.items.map((it, idx) => `  ${idx + 1}. ${it.product || it.type || 'ماددە'} (${it.quantity} دانە @ ${formatMoney(it.price, txCur)}) = ${formatMoney(it.total, txCur)}`).join('\n')
      : `  1. ${tx.material || tx.panelType || 'ماددە'} (${tx.quantity} دانە @ ${formatMoney(tx.sellingAmount, txCur)})`;

    const subject = `وەسڵی فرۆشتن: #${invoiceNum} - کۆمپانیای شاسوار ئەحمەد شاسوار`;
    const refLines = [
      tx.legacyInvoiceRef ? `ژمارەی تۆماری کۆن: ${tx.legacyInvoiceRef}` : '',
      tx.fundermaxBatchRef ? `وەجبەی فەندەرمەکس: ${tx.fundermaxBatchRef}` : '',
    ].filter(Boolean).join('\n');

    const body =
`کۆمپانیای شاسوار ئەحمەد شاسوار
وەسڵی فرۆشتن
-----------------------------
ژمارەی وەسڵ: #${invoiceNum}
بەروار: ${dateFormatted}
کڕیار: ${clientName}${tx.clientPhone ? ` (${tx.clientPhone})` : ''}
${refLines ? `${refLines}\n` : ''}-----------------------------
کاڵاکان:
${itemsList}
-----------------------------
کۆی گشتی: ${formatMoney(invoiceTotal, txCur)}
پارەی دراو: ${formatMoney(paidNow, txCur)}
قەرزی ماوە: ${formatMoney(totalDebt, txCur)}
-----------------------------
سوپاس بۆ مامەڵەکردنتان - سیستەمی وەستای باکۆ`;

    return {
      subject,
      body,
      whatsAppUrl: `https://wa.me/?text=${encodeURIComponent(body)}`,
      mailtoUrl: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    };
  } else {
    const itemsList = (tx.items && tx.items.length > 0)
      ? tx.items.map((it, idx) => `  ${idx + 1}. ${it.product || it.type || 'Panel Item'} (${it.quantity} pcs @ ${formatMoney(it.price, txCur)}) = ${formatMoney(it.total, txCur)}`).join('\n')
      : `  1. ${tx.material || tx.panelType || 'Panel Item'} (${tx.quantity} pcs @ ${formatMoney(tx.sellingAmount, txCur)})`;

    const subject = `Sales Invoice: #${invoiceNum} - Shaswar Ahmad Shaswar Co.`;
    const refLinesEn = [
      tx.legacyInvoiceRef ? `Legacy Invoice Ref: ${tx.legacyInvoiceRef}` : '',
      tx.fundermaxBatchRef ? `FunderMax Batch: ${tx.fundermaxBatchRef}` : '',
    ].filter(Boolean).join('\n');

    const body =
`Shaswar Ahmad Shaswar Co. - Wood & Panels Workshop
Official Sales Receipt
-----------------------------
Invoice #: #${invoiceNum}
Date: ${dateFormatted}
Customer: ${clientName}${tx.clientPhone ? ` (${tx.clientPhone})` : ''}
${refLinesEn ? `${refLinesEn}\n` : ''}-----------------------------
Item Breakdown:
${itemsList}
-----------------------------
Subtotal / Total: ${formatMoney(invoiceTotal, txCur)}
Paid Amount: ${formatMoney(paidNow, txCur)}
Balance Due / Outstanding Debt: ${formatMoney(totalDebt, txCur)}
-----------------------------
Thank you for your business - Bako's Master System`;

    return {
      subject,
      body,
      whatsAppUrl: `https://wa.me/?text=${encodeURIComponent(body)}`,
      mailtoUrl: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    };
  }
}

/**
 * Direct launcher for WhatsApp receipt sharing.
 */
export function openWhatsAppReceipt(
  tx: PanelTransaction,
  formatMoney: (val: number, cur?: any) => string,
  lang: 'ku' | 'en' = 'ku'
) {
  const { whatsAppUrl } = formatInvoiceReceipt(tx, formatMoney, lang);
  if (typeof window !== 'undefined') {
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Direct launcher for Email/Gmail receipt sharing.
 */
export function openEmailReceipt(
  tx: PanelTransaction,
  formatMoney: (val: number, cur?: any) => string,
  lang: 'ku' | 'en' = 'ku'
) {
  const { mailtoUrl } = formatInvoiceReceipt(tx, formatMoney, lang);
  if (typeof window !== 'undefined') {
    window.location.href = mailtoUrl;
  }
}
