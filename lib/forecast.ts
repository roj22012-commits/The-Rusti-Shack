/**
 * Three real statistical forecasting methods, applied to a monthly time
 * series (e.g. revenue or margin). Each returns a forecast point per future
 * month plus a confidence band that widens with the horizon. No AI/LLM is
 * involved anywhere in this file -- these are closed-form statistical
 * methods, computed the same way every time for the same input.
 */

export type ForecastPoint = { month: string; yhat: number; lower: number; upper: number };

const Z_95 = 1.96;

function monthKey(year: number, monthNum: number): string {
  return `${year}-${String(monthNum).padStart(2, "0")}-01`;
}

function addMonths(year: number, monthNum: number, n: number): { year: number; monthNum: number } {
  const total = year * 12 + (monthNum - 1) + n;
  return { year: Math.floor(total / 12), monthNum: (total % 12) + 1 };
}

/**
 * Model 1: Linear trend regression (ordinary least squares).
 *
 * Fits a straight line, revenue = a + b*t, through the historical months
 * (t = 0, 1, 2, ... in order) by minimizing squared error, then
 * extrapolates that line forward. The confidence band is the textbook OLS
 * prediction interval: it's narrowest right after the last known month and
 * widens the further out (and the further the forecast point's position
 * is from the center of the historical data) you go, using the model's
 * own residual standard error.
 *
 * Assumes: the underlying trend is a straight line -- steady growth or
 * decline at a constant pace. It does not know about seasonality, so a
 * seasonal business will see this model's line run straight through the
 * seasonal peaks and dips.
 */
export function linearTrendForecast(
  history: { year: number; monthNum: number; value: number }[],
  horizon: number
): { fitted: ForecastPoint[]; forecast: ForecastPoint[] } {
  const n = history.length;
  const xs = history.map((_, i) => i);
  const ys = history.map((h) => h.value);
  const xbar = xs.reduce((a, b) => a + b, 0) / n;
  const ybar = ys.reduce((a, b) => a + b, 0) / n;
  const Sxx = xs.reduce((s, x) => s + (x - xbar) ** 2, 0);
  const Sxy = xs.reduce((s, x, i) => s + (x - xbar) * (ys[i] - ybar), 0);
  const slope = Sxy / Sxx;
  const intercept = ybar - slope * xbar;

  const residuals = xs.map((x, i) => ys[i] - (intercept + slope * x));
  const sse = residuals.reduce((s, r) => s + r * r, 0);
  const se = Math.sqrt(sse / Math.max(1, n - 2));

  function predictionInterval(x: number) {
    const yhat = intercept + slope * x;
    const width = Z_95 * se * Math.sqrt(1 + 1 / n + (x - xbar) ** 2 / Sxx);
    return { yhat, lower: yhat - width, upper: yhat + width };
  }

  const fitted: ForecastPoint[] = history.map((h, i) => {
    const p = predictionInterval(i);
    return { month: monthKey(h.year, h.monthNum), ...p };
  });

  const last = history[history.length - 1];
  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const { year, monthNum } = addMonths(last.year, last.monthNum, h);
    const p = predictionInterval(n - 1 + h);
    forecast.push({ month: monthKey(year, monthNum), ...p });
  }

  return { fitted, forecast };
}

/**
 * Model 2: Holt's linear trend (double exponential smoothing).
 *
 * Keeps a running "level" (where the series is right now) and "trend"
 * (how fast it's currently moving), each updated every month as a
 * weighted blend of the new data point and the prior estimate -- alpha
 * controls how much weight recent months get for the level, beta does
 * the same for the trend. Because recent months count for more, this
 * model reacts to a recent acceleration or slowdown faster than the
 * straight-line regression does.
 *
 * Assumes: the current pace of change (not the whole history's average
 * pace) is the best guide to what's next. Like the regression model, it
 * has no notion of a repeating yearly season on its own.
 *
 * The band width grows with the square root of the horizon: it reflects
 * the model's typical one-month-ahead error, scaled up for how many
 * months of compounding uncertainty sit between now and that point.
 */
export function exponentialSmoothingForecast(
  history: { year: number; monthNum: number; value: number }[],
  horizon: number,
  alpha = 0.4,
  beta = 0.2
): { fitted: ForecastPoint[]; forecast: ForecastPoint[] } {
  const n = history.length;
  let level = history[0].value;
  let trend = n > 1 ? history[1].value - history[0].value : 0;

  const fitted: ForecastPoint[] = [];
  const oneStepErrors: number[] = [];

  for (let i = 0; i < n; i++) {
    const actual = history[i].value;
    const priorForecast = level + trend;
    if (i > 0) oneStepErrors.push(actual - priorForecast);

    const prevLevel = level;
    level = alpha * actual + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;

    fitted.push({
      month: monthKey(history[i].year, history[i].monthNum),
      yhat: priorForecast,
      lower: priorForecast,
      upper: priorForecast,
    });
  }

  const sigma =
    oneStepErrors.length > 0
      ? Math.sqrt(oneStepErrors.reduce((s, e) => s + e * e, 0) / oneStepErrors.length)
      : 0;

  const last = history[n - 1];
  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const { year, monthNum } = addMonths(last.year, last.monthNum, h);
    const yhat = level + trend * h;
    const width = Z_95 * sigma * Math.sqrt(h);
    forecast.push({ month: monthKey(year, monthNum), yhat, lower: yhat - width, upper: yhat + width });
  }

  return { fitted, forecast };
}

/**
 * Model 3: Classical seasonal decomposition (trend + seasonal index).
 *
 * Splits history into a slow-moving trend (a centered 12-month moving
 * average, which cancels out any single season by construction) and a
 * seasonal index per calendar month (how far above or below trend that
 * month typically runs, averaged across every year on record). The
 * forecast extends the trend line forward and re-applies each future
 * month's own seasonal index -- so a forecast for December carries
 * December's historical bump, not an average month's.
 *
 * Assumes: the seasonal pattern itself (which months run hot or cold
 * relative to trend) stays stable year to year, even if the overall
 * trend line is rising or falling. This is the model to trust for a
 * business like Rusti's, where Dry Peak/Typhoon/Shoulder swings dominate
 * month-to-month noise.
 *
 * The band widens with the square root of the horizon, same reasoning as
 * the exponential smoothing model, scaled from this model's own
 * detrended-and-deseasonalized residuals.
 */
export function seasonalForecast(
  history: { year: number; monthNum: number; value: number }[],
  horizon: number
): { fitted: ForecastPoint[]; forecast: ForecastPoint[] } {
  const n = history.length;
  const values = history.map((h) => h.value);

  // Centered 12-month moving average as the trend estimate.
  const trend: (number | null)[] = values.map((_, i) => {
    if (i < 6 || i > n - 7) return null;
    let sum = 0;
    for (let k = -6; k <= 6; k++) {
      const w = k === -6 || k === 6 ? 0.5 : 1;
      sum += values[i + k] * w;
    }
    return sum / 12;
  });

  // Seasonal index per calendar month: average (actual - trend) where trend exists.
  const seasonalSums = new Array(13).fill(0);
  const seasonalCounts = new Array(13).fill(0);
  for (let i = 0; i < n; i++) {
    const t = trend[i];
    if (t === null) continue;
    const m = history[i].monthNum;
    seasonalSums[m] += values[i] - t;
    seasonalCounts[m] += 1;
  }
  const seasonalIndex = seasonalSums.map((s, m) => (seasonalCounts[m] > 0 ? s / seasonalCounts[m] : 0));

  // Linear fit on the trend points themselves, to extrapolate the trend forward.
  const trendPoints = trend
    .map((t, i) => (t === null ? null : { x: i, y: t }))
    .filter((p): p is { x: number; y: number } => p !== null);
  const txbar = trendPoints.reduce((s, p) => s + p.x, 0) / trendPoints.length;
  const tybar = trendPoints.reduce((s, p) => s + p.y, 0) / trendPoints.length;
  const tSxx = trendPoints.reduce((s, p) => s + (p.x - txbar) ** 2, 0);
  const tSxy = trendPoints.reduce((s, p) => s + (p.x - txbar) * (p.y - tybar), 0);
  const tSlope = tSxy / tSxx;
  const tIntercept = tybar - tSlope * txbar;

  const fitted: ForecastPoint[] = history.map((h, i) => {
    const trendAtI = tIntercept + tSlope * i;
    const yhat = trendAtI + seasonalIndex[h.monthNum];
    return { month: monthKey(h.year, h.monthNum), yhat, lower: yhat, upper: yhat };
  });

  const residuals = history.map((h, i) => h.value - fitted[i].yhat);
  const sigma = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 1));

  const last = history[n - 1];
  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const { year, monthNum } = addMonths(last.year, last.monthNum, h);
    const trendAtPoint = tIntercept + tSlope * (n - 1 + h);
    const yhat = trendAtPoint + seasonalIndex[monthNum];
    const width = Z_95 * sigma * Math.sqrt(h);
    forecast.push({ month: monthKey(year, monthNum), yhat, lower: yhat - width, upper: yhat + width });
  }

  return { fitted, forecast };
}

export type ForecastModelId = "linear" | "exponential" | "seasonal";

export const FORECAST_MODELS: {
  id: ForecastModelId;
  label: string;
  typicalError: string;
  explanation: string;
}[] = [
  {
    id: "linear",
    label: "Linear trend",
    typicalError: "Best when growth is steady",
    explanation:
      "Draws the single straight line that best fits every month on record, then extends it. " +
      "It assumes the business grows (or shrinks) at one constant pace and has no idea some " +
      "months are naturally busier than others -- so its line runs flat through peaks and dips. " +
      "Trust it for a big-picture, several-year view; it will smooth right past any single season.",
  },
  {
    id: "exponential",
    label: "Recent-trend smoothing",
    typicalError: "Best right after a recent shift",
    explanation:
      "Tracks where the business is right now and how fast that's changing, giving recent months " +
      "more weight than old ones. It reacts quickly if growth has sped up or slowed down lately, " +
      "but like the linear model it doesn't know about seasons on its own -- it just projects the " +
      "current pace forward.",
  },
  {
    id: "seasonal",
    label: "Seasonal pattern",
    typicalError: "Best for month-to-month planning",
    explanation:
      "Separates history into a slow-moving trend and a repeating month-by-month seasonal shape " +
      "(how much higher or lower each calendar month typically runs), then projects the trend " +
      "forward and re-applies the right season to each future month. This is the model built to " +
      "know that December and July don't look alike -- trust it most for near-term inventory and " +
      "staffing decisions.",
  },
];

export function runForecastModel(
  model: ForecastModelId,
  history: { year: number; monthNum: number; value: number }[],
  horizon: number
) {
  if (model === "linear") return linearTrendForecast(history, horizon);
  if (model === "exponential") return exponentialSmoothingForecast(history, horizon);
  return seasonalForecast(history, horizon);
}
