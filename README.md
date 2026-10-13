# Task 3: OHLC candles

**Time: 20 minutes. No AI assistants.**

`data/ticks.json` contains ~30 minutes of price ticks for a few instruments.
Implement `buildCandles(ticks, intervalMs)` in `src/candles.ts`, which aggregates
the ticks into OHLC candles (the bars you see on a trading chart).

```bash
npm test            # run tests once
npm run test:watch  # watch mode
```

## Rules

- Input: an array of ticks `{ instrument, time, bid, ask }`, **sorted by `time`**
  (ascending). `time` is Unix epoch milliseconds. Ticks of different instruments
  are interleaved.
- The price of a tick is its **mid**: `(bid + ask) / 2`. No rounding needed.
- Candles are built **per instrument**, for intervals aligned to the epoch:
  `start = floor(time / intervalMs) * intervalMs`. A tick exactly on a boundary
  belongs to the interval that **starts** there.
- For every interval that contains at least one tick, produce:

  | field    | value                                   |
  | -------- | --------------------------------------- |
  | `open`   | mid of the first tick in the interval   |
  | `high`   | highest mid in the interval             |
  | `low`    | lowest mid in the interval              |
  | `close`  | mid of the last tick in the interval    |
  | `volume` | number of ticks in the interval         |

- Intervals without ticks produce **no** candle.
- Output: sorted by `instrument` (alphabetically), then by `start` (ascending).

Talk us through your approach and its time/space complexity.
