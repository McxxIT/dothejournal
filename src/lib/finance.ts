import { TRADING_TIME_ZONE, toDateKey } from '@/lib/date'
import type {
  DailyPnl,
  DashboardMetrics,
  EquityPoint,
  EquitySnapshot,
  MonthSummary,
} from '@/lib/journal/types'

export interface MetricsTrade {
  netPnl: number | string | null
  rMultiple?: number | string | null
}

export interface EquityTrade {
  id: string
  exitTime: string | null
  netPnl: number | string | null
}

export interface PnlTrade {
  exitTime: string | null
  netPnl: number | string | null
}

export function toFiniteNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toCents(value: number | string | null | undefined): number {
  return Math.round(toFiniteNumber(value) * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function roundRatio(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

export function calculateMetrics(trades: MetricsTrade[], truncated = false): DashboardMetrics {
  let netCents = 0
  let grossProfitCents = 0
  let grossLossCents = 0
  let winningTrades = 0
  let losingTrades = 0
  let breakevenTrades = 0
  let rSum = 0
  let rCount = 0

  for (const trade of trades) {
    const cents = toCents(trade.netPnl)
    netCents += cents

    if (cents > 0) {
      winningTrades += 1
      grossProfitCents += cents
    } else if (cents < 0) {
      losingTrades += 1
      grossLossCents += cents
    } else {
      breakevenTrades += 1
    }

    if (trade.rMultiple !== null && trade.rMultiple !== undefined) {
      const r = Number(trade.rMultiple)
      if (Number.isFinite(r)) {
        rSum += r
        rCount += 1
      }
    }
  }

  const totalTrades = trades.length
  const grossLossAbsCents = Math.abs(grossLossCents)

  return {
    netPnl: fromCents(netCents),
    winningTrades,
    losingTrades,
    breakevenTrades,
    totalTrades,
    winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : null,
    profitFactor:
      grossLossAbsCents > 0 ? fromCents(grossProfitCents) / fromCents(grossLossAbsCents) : null,
    grossProfit: fromCents(grossProfitCents),
    grossLoss: fromCents(grossLossCents),
    avgWin: winningTrades > 0 ? fromCents(grossProfitCents / winningTrades) : null,
    avgLoss: losingTrades > 0 ? fromCents(grossLossCents / losingTrades) : null,
    avgR: rCount > 0 ? roundRatio(rSum / rCount) : null,
    expectancy: totalTrades > 0 ? fromCents(netCents / totalTrades) : null,
    truncated,
  }
}

export function buildEquitySnapshot(trades: EquityTrade[], baseline: number): EquitySnapshot {
  const sorted = trades
    .filter((trade): trade is EquityTrade & { exitTime: string } => {
      if (!trade.exitTime) return false
      return Number.isFinite(Date.parse(trade.exitTime))
    })
    .sort((a, b) => {
      const byTime = Date.parse(a.exitTime) - Date.parse(b.exitTime)
      return byTime !== 0 ? byTime : a.id.localeCompare(b.id)
    })

  const baselineCents = toCents(baseline)
  const points: EquityPoint[] = []

  if (sorted.length > 0) {
    const firstTs = Date.parse(sorted[0].exitTime)
    points.push({
      tradeId: null,
      ts: firstTs - 1,
      dateKey: toDateKey(sorted[0].exitTime),
      equity: fromCents(baselineCents),
      cumulativePnl: 0,
      drawdown: 0,
      isStart: true,
    })
  }

  let cumulativeCents = 0
  let peakCents = baselineCents
  let runningPeakPoint: EquityPoint | null = points[0] ?? null
  let maxDrawdownCents = 0
  let drawdownPeak: EquityPoint | null = null
  let drawdownTrough: EquityPoint | null = null

  for (const trade of sorted) {
    cumulativeCents += toCents(trade.netPnl)
    const equityCents = baselineCents + cumulativeCents
    const point: EquityPoint = {
      tradeId: trade.id,
      ts: Date.parse(trade.exitTime),
      dateKey: toDateKey(trade.exitTime),
      equity: fromCents(equityCents),
      cumulativePnl: fromCents(cumulativeCents),
      drawdown: 0,
      isStart: false,
    }

    if (equityCents > peakCents) {
      peakCents = equityCents
      runningPeakPoint = point
    }

    const drawdownCents = equityCents - peakCents
    point.drawdown = fromCents(drawdownCents)

    if (drawdownCents < maxDrawdownCents) {
      maxDrawdownCents = drawdownCents
      drawdownPeak = runningPeakPoint
      drawdownTrough = point
    }

    points.push(point)
  }

  const current = points[points.length - 1] ?? null

  return {
    points,
    baseline: fromCents(baselineCents),
    currentEquity: current?.equity ?? fromCents(baselineCents),
    netPnl: fromCents(cumulativeCents),
    totalReturnPct:
      baselineCents !== 0 ? roundRatio((cumulativeCents / baselineCents) * 100) : null,
    maxDrawdown: fromCents(maxDrawdownCents),
    maxDrawdownPct:
      drawdownPeak && drawdownPeak.equity !== 0
        ? roundRatio((fromCents(maxDrawdownCents) / drawdownPeak.equity) * 100)
        : null,
    peak: drawdownPeak,
    trough: drawdownTrough,
    truncated: false,
  }
}

export function aggregateDailyPnl(
  trades: PnlTrade[],
  timeZone: string = TRADING_TIME_ZONE,
): DailyPnl[] {
  const buckets = new Map<string, { cents: number; tradeCount: number }>()

  for (const trade of trades) {
    if (!trade.exitTime) continue
    const parsed = Date.parse(trade.exitTime)
    if (!Number.isFinite(parsed)) continue
    const dateKey = toDateKey(trade.exitTime, timeZone)
    const bucket = buckets.get(dateKey) ?? { cents: 0, tradeCount: 0 }
    bucket.cents += toCents(trade.netPnl)
    bucket.tradeCount += 1
    buckets.set(dateKey, bucket)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, bucket]) => ({
      dateKey,
      netPnl: fromCents(bucket.cents),
      tradeCount: bucket.tradeCount,
    }))
}

export function summarizeMonth(daily: DailyPnl[], monthKey: string): MonthSummary {
  const monthDays = daily.filter((day) => day.dateKey.startsWith(`${monthKey}-`))
  let netCents = 0
  let tradeCount = 0
  let bestDay: DailyPnl | null = null
  let worstDay: DailyPnl | null = null

  for (const day of monthDays) {
    netCents += toCents(day.netPnl)
    tradeCount += day.tradeCount
    if (!bestDay || day.netPnl > bestDay.netPnl) bestDay = day
    if (!worstDay || day.netPnl < worstDay.netPnl) worstDay = day
  }

  return {
    monthKey,
    netPnl: fromCents(netCents),
    tradingDays: monthDays.length,
    tradeCount,
    bestDay,
    worstDay,
  }
}

export function computeRMultiple(
  netPnl: number | string | null | undefined,
  initialRiskAmount: number | string | null | undefined,
): number | null {
  if (netPnl === null || netPnl === undefined) return null
  const risk = toFiniteNumber(initialRiskAmount)
  if (risk <= 0) return null
  return roundRatio(toFiniteNumber(netPnl) / risk)
}

export function downsampleEquity(points: EquityPoint[], maxPoints = 400): EquityPoint[] {
  if (points.length <= maxPoints) return points
  const stride = Math.ceil(points.length / maxPoints)
  const sampled: EquityPoint[] = []
  for (let index = 0; index < points.length; index += stride) {
    sampled.push(points[index])
  }
  const last = points[points.length - 1]
  if (sampled[sampled.length - 1] !== last) sampled.push(last)
  return sampled
}
