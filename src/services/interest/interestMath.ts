import Decimal from 'decimal.js';

const RATE_ANNUAL = new Decimal('27.5'); // 27.5% per annum

/**
 * Days in the year for interest divisor. Leap year = 366, else 365.
 */
export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

/**
 * Daily interest rate (no floating point). rate = annual / daysInYear.
 */
export function dailyRateForYear(year: number): Decimal {
  return new Decimal(RATE_ANNUAL).div(daysInYear(year)).div(100);
}

export function dailyRateDecimalForDate(date: Date): Decimal {
  return dailyRateForYear(date.getFullYear());
}

/**
 * Interest for one day on a given balance (cents). Uses integer cents and rounds down.
 * Formula: floor(balanceCents * dailyRate).
 */
export function dailyInterestCents(balanceCents: number, date: Date): number {
  const year = date.getFullYear();
  const rate = dailyRateForYear(year);
  return new Decimal(balanceCents).times(rate).floor().toNumber();
}
