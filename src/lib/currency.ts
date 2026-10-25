import { CurrencyCode, ExchangeRates } from '../types/inventory';
export type { CurrencyCode, ExchangeRates };

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  usdToIqd: 1500,
  eurToUsd: 1.08,
  eurToIqd: 1620,
  USD_IQD: 150000,
  EUR_IQD: 162000,
  EUR_USD: 1.08,
};

export const MARKET_REFERENCE_RATES: ExchangeRates = {
  usdToIqd: 1530,
  eurToUsd: 1.085,
  eurToIqd: 1660,
  USD_IQD: 153000,
  EUR_IQD: 166000,
  EUR_USD: 1.085,
};

export const MARKET_REFERENCE_NOTICE =
  'Note: Reference rates are for orientation only. Always confirm local transaction cash rates.';

/**
 * Normalizes rates whether entered per $1 (e.g. 1500) or per $100 (e.g. 150000)
 */
export function normalizeIqdRate(rate: number): number {
  if (!rate || isNaN(rate)) return 1500;
  if (rate > 10000) return rate / 100;
  return rate;
}

export function convertCurrencyValue(
  val: number,
  fromCur: CurrencyCode | string,
  toCur: CurrencyCode | string,
  rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number {
  if (fromCur === toCur || !val || isNaN(val)) return val || 0;

  const usdToIqd = normalizeIqdRate(rates.usdToIqd || rates.USD_IQD || 1500);
  const eurToUsd = rates.eurToUsd || rates.EUR_USD || 1.08;
  const eurToIqd = normalizeIqdRate(rates.eurToIqd || rates.EUR_IQD || (usdToIqd * eurToUsd));

  let result = val;

  // USD <-> IQD direct rate
  if (fromCur === 'USD' && toCur === 'IQD') {
    result = val * usdToIqd;
  } else if (fromCur === 'IQD' && toCur === 'USD') {
    result = usdToIqd > 0 ? val / usdToIqd : val;
  }
  // EUR <-> USD direct rate
  else if (fromCur === 'EUR' && toCur === 'USD') {
    result = val * eurToUsd;
  } else if (fromCur === 'USD' && toCur === 'EUR') {
    result = eurToUsd > 0 ? val / eurToUsd : val;
  }
  // EUR <-> IQD direct independent rate
  else if (fromCur === 'EUR' && toCur === 'IQD') {
    result = val * eurToIqd;
  } else if (fromCur === 'IQD' && toCur === 'EUR') {
    result = eurToIqd > 0 ? val / eurToIqd : val;
  }

  if (toCur === 'IQD') {
    return Math.round(result);
  }
  return parseFloat(result.toFixed(2));
}

export function formatMoney(amount: number, cur: CurrencyCode | string = 'USD'): string {
  const num = isNaN(amount) ? 0 : amount;
  if (cur === 'IQD') {
    return `${Math.round(num).toLocaleString('en-US')} IQD`;
  } else if (cur === 'EUR') {
    return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
