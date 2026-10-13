export interface Tick {
  instrument: string;
  /** Unix epoch, milliseconds */
  time: number;
  bid: number;
  ask: number;
}

export interface Candle {
  instrument: string;
  /** Start of the interval, Unix epoch milliseconds */
  start: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Number of ticks in the interval */
  volume: number;
}

/**
 * Aggregates ticks into OHLC candles of `intervalMs`. See README.md for the rules.
 */
export function buildCandles(ticks: Tick[], intervalMs: number): Candle[] {
  // TODO: implement
  throw new Error('Not implemented');
}
