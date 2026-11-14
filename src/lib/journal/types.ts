export type Direction = 'long' | 'short'

export type DateRangePreset = '7d' | '30d' | '90d' | 'ytd' | 'all'

export interface TradeFilters {
  from: string | null
  to: string | null
  accountId: string | null
  symbol: string
  direction: Direction | null
  page: number
  pageSize: number
}

export interface AccountOption {
  id: string
  name: string
  broker: string | null
  accountType: string | null
  startingBalance: number
}

export interface LedgerTrade {
  id: string
  accountId: string
  accountName: string
  symbol: string
  assetClass: string
  direction: Direction
  entryTime: string
  exitTime: string
  avgEntryPrice: number
  avgExitPrice: number | null
  totalQuantity: number
  grossPnl: number | null
  fees: number
  netPnl: number
  initialRiskAmount: number | null
  rMultiple: number | null
  notes: string | null
  tags: string[]
}

export interface DailyPnl {
  dateKey: string
  netPnl: number
  tradeCount: number
}

export interface MonthSummary {
  monthKey: string
  netPnl: number
  tradingDays: number
  tradeCount: number
  bestDay: DailyPnl | null
  worstDay: DailyPnl | null
}

export interface DashboardMetrics {
  netPnl: number
  winningTrades: number
  losingTrades: number
  breakevenTrades: number
  totalTrades: number
  winRate: number | null
  profitFactor: number | null
  grossProfit: number
  grossLoss: number
  avgWin: number | null
  avgLoss: number | null
  avgR: number | null
  expectancy: number | null
  truncated: boolean
}

export interface EquityPoint {
  tradeId: string | null
  ts: number
  dateKey: string
  equity: number
  cumulativePnl: number
  drawdown: number
  isStart: boolean
}

export interface EquitySnapshot {
  points: EquityPoint[]
  baseline: number
  currentEquity: number
  netPnl: number
  totalReturnPct: number | null
  maxDrawdown: number
  maxDrawdownPct: number | null
  peak: EquityPoint | null
  trough: EquityPoint | null
  truncated: boolean
}

export interface LedgerPage {
  rows: LedgerTrade[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface JournalSnapshot {
  accounts: AccountOption[]
  filters: TradeFilters
  baseline: number
  metrics: DashboardMetrics
  equity: EquitySnapshot
  daily: DailyPnl[]
  ledger: LedgerPage
  timeZone: string
  truncated: boolean
  generatedAt: string
}

export type JournalActionResult =
  | { ok: true; data: JournalSnapshot }
  | { ok: false; error: string }

export interface TradeUpdatePayload {
  tradeId: string
  notes: string
  initialRiskAmount: number | null
  tags: string[]
}

export interface UpdatedTrade {
  id: string
  notes: string | null
  initialRiskAmount: number | null
  rMultiple: number | null
  tags: string[]
}

export type UpdateTradeResult =
  | { ok: true; trade: UpdatedTrade }
  | { ok: false; error: string }
