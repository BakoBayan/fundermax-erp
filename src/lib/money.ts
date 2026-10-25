/**
 * Currency-safe money helpers (shared by client and server).
 *
 * Rules:
 *  - IQD has no minor unit: always a whole-number integer.
 *  - USD and EUR are fixed to 2 decimals using exponent-shifted rounding, so that
 *    values such as 1.005 or 0.1 + 0.2 never drift at the persistence boundary.
 *  - Every sale stores an immutable snapshot of the rate used at checkout:
 *      chargedAmount, chargedCurrency, exchangeRateApplied, baseUsdEquivalent.
 *    exchangeRateApplied is always expressed as "units of the charged currency per 1 USD"
 *    (USD = 1, IQD = e.g. 1530, EUR = 1 / eurToUsd).
 */
import type { CurrencyCode, ExchangeRates } from '../types/inventory';
import { normalizeIqdRate } from './currency';

export interface MoneySnapshot {
  chargedAmount: number;
  chargedCurrency: CurrencyCode;
  exchangeRateApplied: number;
  baseUsdEquivalent: number;
}

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return v === 'USD' || v === 'EUR' || v === 'IQD';
}

/** Half-away-from-zero rounding to `decimals` places without binary float drift. */
function roundDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  if (abs < 1e-9) return 0;
  if (abs >= 1e15) return sign * Math.round(abs);
  const shifted = Math.round(Number(`${abs}e${decimals}`));
  if (!Number.isFinite(shifted)) return sign * Math.round(abs * 10 ** decimals) / 10 ** decimals;
  return sign * Number(`${shifted}e-${decimals}`);
}

/** Normalizes an amount for storage: IQD integer, USD/EUR 2 decimals. */
export function roundMoney(amount: number, currency: CurrencyCode | string | undefined): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return currency === 'IQD' ? roundDecimals(n, 0) : roundDecimals(n, 2);
}

/** Integer minor units: IQD whole dinars, USD/EUR cents. */
export function toMinorUnits(amount: number, currency: CurrencyCode | string | undefined): number {
  const rounded = roundMoney(amount, currency);
  return currency === 'IQD' ? rounded : Math.round(rounded * 100);
}

export function fromMinorUnits(minor: number, currency: CurrencyCode | string | undefined): number {
  return currency === 'IQD' ? Math.round(minor) : roundDecimals(minor / 100, 2);
}

/** Converts a charged amount to its USD base using the stored units-per-USD rate. */
export function baseUsdFromRate(amount: number, currency: CurrencyCode, ratePerUsd: number): number {
  if (currency === 'USD') return roundMoney(amount, 'USD');
  if (!(ratePerUsd > 0)) return 0;
  return roundMoney(amount / ratePerUsd, 'USD');
}

/** Units of `currency` per 1 USD, derived from the live exchange-rate table. */
export function ratePerUsdFromRates(currency: CurrencyCode, rates: ExchangeRates): number {
  if (currency === 'USD') return 1;
  if (currency === 'IQD') return normalizeIqdRate(rates.usdToIqd || rates.USD_IQD || 1500);
  const eurToUsd = rates.eurToUsd || rates.EUR_USD || 1.08;
  return 1 / eurToUsd;
}

/** Builds the immutable money snapshot at the moment of checkout. */
export function buildMoneySnapshot(amount: number, currency: CurrencyCode, rates: ExchangeRates): MoneySnapshot {
  const rate = ratePerUsdFromRates(currency, rates);
  const chargedAmount = roundMoney(amount, currency);
  return {
    chargedAmount,
    chargedCurrency: currency,
    exchangeRateApplied: rate,
    baseUsdEquivalent: baseUsdFromRate(chargedAmount, currency, rate),
  };
}

/**
 * Re-derives a snapshot for rows saved before v1.5 (only `currency` + `currencyRate` exist).
 * Legacy `currencyRate` meaning: IQD -> IQD per USD, EUR -> USD per EUR, USD -> 1.
 */
export function legacyRatePerUsd(currency: CurrencyCode, legacyRate: number | undefined): number {
  if (currency === 'USD') return 1;
  if (currency === 'IQD') return normalizeIqdRate(legacyRate && legacyRate > 0 ? legacyRate : 1500);
  const eurToUsd = legacyRate && legacyRate > 0 ? legacyRate : 1.08;
  return 1 / eurToUsd;
}
