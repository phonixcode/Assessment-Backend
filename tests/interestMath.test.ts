import {
  daysInYear,
  dailyRateForYear,
  dailyInterestCents,
  dailyRateDecimalForDate,
} from '../src/services/interest/interestMath';
import Decimal from 'decimal.js';

describe('daysInYear', () => {
  it('returns 365 for non-leap years', () => {
    expect(daysInYear(2023)).toBe(365);
    expect(daysInYear(2022)).toBe(365);
    expect(daysInYear(1900)).toBe(365);
  });

  it('returns 366 for leap years divisible by 4 but not 100', () => {
    expect(daysInYear(2024)).toBe(366);
    expect(daysInYear(2020)).toBe(366);
    expect(daysInYear(2000)).toBe(366);
  });

  it('returns 365 for years divisible by 100 but not 400', () => {
    expect(daysInYear(1900)).toBe(365);
    expect(daysInYear(2100)).toBe(365);
  });

  it('returns 366 for years divisible by 400', () => {
    expect(daysInYear(2000)).toBe(366);
    expect(daysInYear(2400)).toBe(366);
  });
});

describe('dailyRateForYear', () => {
  it('uses 27.5% per annum and divides by 365 for non-leap year', () => {
    const rate = dailyRateForYear(2023);
    const expected = new Decimal('27.5').div(365).div(100);
    expect(rate.toFixed(10)).toBe(expected.toFixed(10));
  });

  it('uses 366 for leap year', () => {
    const rate = dailyRateForYear(2024);
    const expected = new Decimal('27.5').div(366).div(100);
    expect(rate.toFixed(10)).toBe(expected.toFixed(10));
  });

  it('daily rate * 365 (non-leap) reconstructs annual rate', () => {
    const daily = dailyRateForYear(2023);
    const annual = daily.times(365).times(100);
    expect(annual.toFixed(2)).toBe('27.50');
  });

  it('daily rate * 366 (leap) reconstructs annual rate', () => {
    const daily = dailyRateForYear(2024);
    const annual = daily.times(366).times(100);
    expect(annual.toFixed(2)).toBe('27.50');
  });
});

describe('dailyInterestCents', () => {
  it('computes interest with no floating-point error for round numbers', () => {
    const date = new Date('2023-06-15');
    const cents = dailyInterestCents(100_00, date);
    const expected = new Decimal(100_00).times('27.5').div(365).div(100).floor().toNumber();
    expect(cents).toBe(expected);
  });

  it('floors result (no rounding up)', () => {
    const date = new Date('2023-01-01');
    const cents = dailyInterestCents(1, date);
    expect(cents).toBe(0);
  });

  it('leap year uses 366 days', () => {
    const nonLeap = dailyInterestCents(100_00_00, new Date('2023-01-01'));
    const leap = dailyInterestCents(100_00_00, new Date('2024-01-01'));
    expect(leap).toBeLessThan(nonLeap);
    const rate2023 = dailyRateForYear(2023);
    const rate2024 = dailyRateForYear(2024);
    expect(new Decimal(leap).toFixed(4)).toBe(
      new Decimal(100_00_00).times(rate2024).floor().toFixed(4)
    );
    expect(new Decimal(nonLeap).toFixed(4)).toBe(
      new Decimal(100_00_00).times(rate2023).floor().toFixed(4)
    );
  });

  it('simple interest over 365 days matches annual rate (no drift)', () => {
    const balanceCents = 1_000_000_00;
    const date = new Date('2023-01-01');
    let total = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() + i);
      total += dailyInterestCents(balanceCents, d);
    }
    const annualExpected = new Decimal(balanceCents).times('27.5').div(100);
    const floor = annualExpected.floor().toNumber();
    expect(total).toBeLessThanOrEqual(floor + 500);
    expect(total).toBeGreaterThanOrEqual(floor - 500);
  });
});

describe('dailyRateDecimalForDate', () => {
  it('returns daily rate for the date year', () => {
    const r1 = dailyRateDecimalForDate(new Date('2023-06-01'));
    const r2 = dailyRateForYear(2023);
    expect(r1.toFixed(10)).toBe(r2.toFixed(10));
  });
});
