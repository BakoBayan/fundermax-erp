import { ActivityLogEntry, PanelTransaction } from '../types/inventory';

export const DEBT_PAYMENT_ACTION = 'DEBT_PAYMENT';

export function buildDebtPaymentDetails(txId: string, drawer: string): string {
  return `txId:${txId}|drawer:${drawer || '-'}`;
}

function parseTxId(details?: string): string | null {
  const m = /txId:([^|]+)/.exec(details || '');
  return m ? m[1] : null;
}

/**
 * Cash collected today toward EXISTING debt on invoices dated before today.
 * Debt payments on an invoice created today are already inside that invoice's
 * amountPaidNow, so they are skipped here to avoid double counting.
 */
export function getTodayDebtPaymentIntake(
  logs: ActivityLogEntry[] | undefined,
  transactions: PanelTransaction[]
): { usd: number; iqd: number } {
  const todayStr = new Date().toISOString().split('T')[0];
  let usd = 0;
  let iqd = 0;
  (logs || []).forEach((log) => {
    if (log.action !== DEBT_PAYMENT_ACTION) return;
    if (new Date(log.timestamp).toISOString().split('T')[0] !== todayStr) return;
    const txId = parseTxId(log.details);
    const tx = txId ? transactions.find((t) => t.id === txId) : undefined;
    if (!tx || tx.isDeleted === 1) return;
    if ((tx.timestamp || '').split('T')[0] === todayStr) return;
    const amount = Number(log.amount) || 0;
    if (log.currency === 'IQD') iqd += amount;
    else usd += amount;
  });
  return { usd, iqd };
}
