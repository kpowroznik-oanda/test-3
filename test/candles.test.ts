import { describe, expect, it } from 'vitest';
import { type Candle, type Tick, buildCandles } from '../src/candles';
import ticks from '../data/ticks.json';

const MINUTE = 60_000;
const T0 = Date.parse('2026-01-05T09:00:00.000Z');
const at = (minutes: number, seconds = 0) => T0 + minutes * MINUTE + seconds * 1000;

/** A tick whose mid is exactly `mid` */
const tick = (instrument: string, time: number, mid: number): Tick => ({ instrument, time, bid: mid - 0.0001, ask: mid + 0.0001 });

/** Compares candles with a tolerance for floating point prices. */
function expectCandles(actual: Candle[], expected: Candle[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((candle, i) => {
    const { open, high, low, close, ...exact } = candle;
    expect(actual[i]).toMatchObject(exact);
    expect(actual[i]!.open).toBeCloseTo(open, 9);
    expect(actual[i]!.high).toBeCloseTo(high, 9);
    expect(actual[i]!.low).toBeCloseTo(low, 9);
    expect(actual[i]!.close).toBeCloseTo(close, 9);
  });
}

describe('buildCandles()', () => {
  it('returns no candles for no ticks', () => {
    expect(buildCandles([], MINUTE)).toEqual([]);
  });

  it('builds a single candle from a single tick, using the mid price', () => {
    const result = buildCandles([{ instrument: 'EUR_USD', time: at(0, 42), bid: 1.1, ask: 1.1002 }], MINUTE);

    expectCandles(result, [
      { instrument: 'EUR_USD', start: at(0), open: 1.1001, high: 1.1001, low: 1.1001, close: 1.1001, volume: 1 },
    ]);
  });

  it('takes open from the first tick, close from the last, high/low from the extremes', () => {
    const result = buildCandles(
      [
        tick('EUR_USD', at(3, 1), 1.2),
        tick('EUR_USD', at(3, 10), 1.5),
        tick('EUR_USD', at(3, 20), 1.1),
        tick('EUR_USD', at(3, 59), 1.3),
      ],
      MINUTE,
    );

    expectCandles(result, [{ instrument: 'EUR_USD', start: at(3), open: 1.2, high: 1.5, low: 1.1, close: 1.3, volume: 4 }]);
  });

  it('puts a tick exactly on a boundary into the candle that starts there', () => {
    const result = buildCandles([tick('EUR_USD', at(0, 30), 1.1), tick('EUR_USD', at(1), 1.2)], MINUTE);

    expectCandles(result, [
      { instrument: 'EUR_USD', start: at(0), open: 1.1, high: 1.1, low: 1.1, close: 1.1, volume: 1 },
      { instrument: 'EUR_USD', start: at(1), open: 1.2, high: 1.2, low: 1.2, close: 1.2, volume: 1 },
    ]);
  });

  it('produces no candles for intervals without ticks', () => {
    const result = buildCandles([tick('EUR_USD', at(0, 5), 1.1), tick('EUR_USD', at(4, 5), 1.2)], MINUTE);

    expect(result.map((candle) => candle.start)).toEqual([at(0), at(4)]);
  });

  it('builds candles per instrument, sorted by instrument and then by start', () => {
    const result = buildCandles(
      [
        tick('USD_JPY', at(0, 1), 150.1),
        tick('EUR_USD', at(0, 2), 1.1),
        tick('USD_JPY', at(0, 3), 150.3),
        tick('EUR_USD', at(1, 4), 1.2),
        tick('AUD_USD', at(1, 5), 0.65),
      ],
      MINUTE,
    );

    expectCandles(result, [
      { instrument: 'AUD_USD', start: at(1), open: 0.65, high: 0.65, low: 0.65, close: 0.65, volume: 1 },
      { instrument: 'EUR_USD', start: at(0), open: 1.1, high: 1.1, low: 1.1, close: 1.1, volume: 1 },
      { instrument: 'EUR_USD', start: at(1), open: 1.2, high: 1.2, low: 1.2, close: 1.2, volume: 1 },
      { instrument: 'USD_JPY', start: at(0), open: 150.1, high: 150.3, low: 150.1, close: 150.3, volume: 2 },
    ]);
  });

  it('supports other interval lengths', () => {
    const result = buildCandles(
      [tick('EUR_USD', at(0, 1), 1.1), tick('EUR_USD', at(4, 59), 1.2), tick('EUR_USD', at(5), 1.3)],
      5 * MINUTE,
    );

    expectCandles(result, [
      { instrument: 'EUR_USD', start: at(0), open: 1.1, high: 1.2, low: 1.1, close: 1.2, volume: 2 },
      { instrument: 'EUR_USD', start: at(5), open: 1.3, high: 1.3, low: 1.3, close: 1.3, volume: 1 },
    ]);
  });

  describe('with data/ticks.json', () => {
    const data = ticks as Tick[];

    it('builds 1-minute candles for the whole data set', () => {
      const candles = buildCandles(data, MINUTE);

      expect(candles).toHaveLength(82);
      expect(candles.reduce((sum, candle) => sum + candle.volume, 0)).toBe(data.length);

      const gbp = candles.filter((candle) => candle.instrument === 'GBP_USD');
      expect(gbp.map((candle) => candle.start)).not.toContain(at(8)); // GBP_USD has a gap 09:07-09:12

      expectCandles(
        candles.filter((candle) => candle.instrument === 'EUR_USD' && candle.start === at(5)),
        [{ instrument: 'EUR_USD', start: at(5), open: 1.10235, high: 1.10235, low: 1.1022, close: 1.1022, volume: 6 }],
      );
      expectCandles(
        gbp.filter((candle) => candle.start === at(12)),
        [{ instrument: 'GBP_USD', start: at(12), open: 1.269765, high: 1.269765, low: 1.269555, close: 1.269555, volume: 3 }],
      );
    });

    it('builds 5-minute candles for the whole data set', () => {
      const candles = buildCandles(data, 5 * MINUTE);

      expect(candles).toHaveLength(18);
      expect(candles.filter((candle) => candle.instrument === 'USD_JPY').map((candle) => candle.volume)).toEqual([
        18, 10, 18, 18, 8, 14,
      ]);
    });
  });
});
