import 'server-only'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  TRADING_TIME_ZONE,
  endOfDayInTimeZone,
  startOfDayInTimeZone,
} from '@/lib/date'
import {
  aggregateDailyPnl,
  buildEquitySnapshot,
  calculateMetrics,
  downsampleEquity,
  toCents,
  toFiniteNumber,
} from '@/lib/finance'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TradeFilters } from '@/lib/journal/types'
import type {
  AccountOption,
  JournalSnapshot,
  LedgerTrade,
} from '@/lib/journal/types'

export interface Viewer {
  supabase: SupabaseClient<Database>
  user: User
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Your session has expired. Sign in again to continue.')
    this.name = 'UnauthorizedError'
  }
}

const AGGREGATE_LIMIT = 10_000
const MAX_ACCOUNTS = 200

const LEDGER_COLUMNS =
  'id,account_id,symbol,asset_class,direction,entry_time,exit_time,avg_entry_price,avg_exit_price,total_quantity,gross_pnl,fees,net_pnl,initial_risk_amount,r_multiple,notes,tags'

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return { supabase, user: data.user }
}

async function fetchAccounts(viewer: Viewer): Promise<AccountOption[]> {
  const { data, error } = await viewer.supabase
    .from('trading_accounts')
    .select('id,name,broker,account_type,starting_balance')
    .eq('user_id', viewer.user.id)
    .order('name', { ascending: true })
    .limit(MAX_ACCOUNTS)

  if (error) throw new Error(`Could not load trading accounts: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    broker: row.broker,
    accountType: row.account_type,
    startingBalance: toFiniteNumber(row.starting_balance),
  }))
}

function buildPnlQuery(viewer: Viewer, filters: TradeFilters, includeDateRange: boolean) {
  let query = viewer.supabase
    .from('trades')
    .select('id,exit_time,net_pnl,r_multiple')
    .eq('user_id', viewer.user.id)
    .eq('status', 'closed')
    .not('exit_time', 'is', null)

  if (filters.accountId) query = query.eq('account_id', filters.accountId)
  if (filters.symbol) query = query.ilike('symbol', `%${filters.symbol}%`)
  if (filters.direction) query = query.eq('direction', filters.direction)

  if (includeDateRange && filters.from) {
    query = query.gte(
      'exit_time',
      startOfDayInTimeZone(filters.from, TRADING_TIME_ZONE).toISOString(),
    )
  }
  if (includeDateRange && filters.to) {
    query = query.lte(
      'exit_time',
      endOfDayInTimeZone(filters.to, TRADING_TIME_ZONE).toISOString(),
    )
  }

  return query
}

export async function getJournalSnapshot(
  filters: TradeFilters,
  viewer?: Viewer,
): Promise<JournalSnapshot> {
  const activeViewer = viewer ?? (await getViewer())
  if (!activeViewer) throw new UnauthorizedError()

  const { supabase, user } = activeViewer
  const accounts = await fetchAccounts(activeViewer)

  const rangeResult = await buildPnlQuery(activeViewer, filters, true)
    .order('exit_time', { ascending: false })
    .order('id', { ascending: false })
    .limit(AGGREGATE_LIMIT + 1)

  if (rangeResult.error) {
    throw new Error(`Could not load trade history: ${rangeResult.error.message}`)
  }

  const rangeTruncated = (rangeResult.data?.length ?? 0) > AGGREGATE_LIMIT
  const rangeRows = (rangeResult.data ?? []).slice(0, AGGREGATE_LIMIT)

  let dailyRows: typeof rangeRows = []
  let dailyTruncated = false

  if (filters.from || filters.to) {
    const dailyResult = await buildPnlQuery(activeViewer, filters, false)
      .order('exit_time', { ascending: false })
      .order('id', { ascending: false })
      .limit(AGGREGATE_LIMIT + 1)

    if (dailyResult.error) {
      throw new Error(`Could not load calendar data: ${dailyResult.error.message}`)
    }
    dailyTruncated = (dailyResult.data?.length ?? 0) > AGGREGATE_LIMIT
    dailyRows = (dailyResult.data ?? []).slice(0, AGGREGATE_LIMIT)
  } else {
    dailyRows = rangeRows
  }

  let countQuery = supabase
    .from('trades')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'closed')
    .not('exit_time', 'is', null)

  if (filters.accountId) countQuery = countQuery.eq('account_id', filters.accountId)
  if (filters.symbol) countQuery = countQuery.ilike('symbol', `%${filters.symbol}%`)
  if (filters.direction) countQuery = countQuery.eq('direction', filters.direction)
  if (filters.from) {
    countQuery = countQuery.gte(
      'exit_time',
      startOfDayInTimeZone(filters.from, TRADING_TIME_ZONE).toISOString(),
    )
  }
  if (filters.to) {
    countQuery = countQuery.lte(
      'exit_time',
      endOfDayInTimeZone(filters.to, TRADING_TIME_ZONE).toISOString(),
    )
  }

  const { count, error: countError } = await countQuery
  if (countError) throw new Error(`Could not count trades: ${countError.message}`)

  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize))
  const page = Math.min(Math.max(1, filters.page), pageCount)
  const offset = (page - 1) * filters.pageSize

  let ledgerQuery = supabase
    .from('trades')
    .select(LEDGER_COLUMNS, { count: 'exact' })
    .eq('user_id', user.id)
    .eq('status', 'closed')
    .not('exit_time', 'is', null)

  if (filters.accountId) ledgerQuery = ledgerQuery.eq('account_id', filters.accountId)
  if (filters.symbol) ledgerQuery = ledgerQuery.ilike('symbol', `%${filters.symbol}%`)
  if (filters.direction) ledgerQuery = ledgerQuery.eq('direction', filters.direction)
  if (filters.from) {
    ledgerQuery = ledgerQuery.gte(
      'exit_time',
      startOfDayInTimeZone(filters.from, TRADING_TIME_ZONE).toISOString(),
    )
  }
  if (filters.to) {
    ledgerQuery = ledgerQuery.lte(
      'exit_time',
      endOfDayInTimeZone(filters.to, TRADING_TIME_ZONE).toISOString(),
    )
  }

  const ledgerResult = await ledgerQuery
    .order('exit_time', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + filters.pageSize - 1)

  if (ledgerResult.error) {
    throw new Error(`Could not load trades: ${ledgerResult.error.message}`)
  }

  const accountNames = new Map(accounts.map((account) => [account.id, account.name]))
  const ledgerRows: LedgerTrade[] = (ledgerResult.data ?? []).map((row) => ({
    id: row.id,
    accountId: row.account_id,
    accountName: accountNames.get(row.account_id) ?? 'Unknown account',
    symbol: row.symbol,
    assetClass: row.asset_class,
    direction: row.direction,
    entryTime: row.entry_time,
    exitTime: row.exit_time ?? row.entry_time,
    avgEntryPrice: toFiniteNumber(row.avg_entry_price),
    avgExitPrice:
      row.avg_exit_price === null ? null : toFiniteNumber(row.avg_exit_price),
    totalQuantity: toFiniteNumber(row.total_quantity),
    grossPnl: row.gross_pnl === null ? null : toFiniteNumber(row.gross_pnl),
    fees: toFiniteNumber(row.fees),
    netPnl: toFiniteNumber(row.net_pnl),
    initialRiskAmount:
      row.initial_risk_amount === null ? null : toFiniteNumber(row.initial_risk_amount),
    rMultiple: row.r_multiple === null ? null : toFiniteNumber(row.r_multiple),
    notes: row.notes,
    tags: Array.isArray(row.tags) ? row.tags : [],
  }))

  const accountsInScope = filters.accountId
    ? accounts.filter((account) => account.id === filters.accountId)
    : accounts
  const baseline = accountsInScope.reduce(
    (totalCents, account) => totalCents + toCents(account.startingBalance),
    0,
  ) / 100

  const equityTrades = rangeRows.flatMap((row) =>
    row.exit_time
      ? [{ id: row.id, exitTime: row.exit_time, netPnl: row.net_pnl }]
      : [],
  )

  const equity = buildEquitySnapshot(equityTrades, baseline)
  equity.truncated = rangeTruncated
  equity.points = downsampleEquity(equity.points, 600)

  const daily = aggregateDailyPnl(
    dailyRows.map((row) => ({ exitTime: row.exit_time, netPnl: row.net_pnl })),
    TRADING_TIME_ZONE,
  )

  const metrics = calculateMetrics(
    rangeRows.map((row) => ({ netPnl: row.net_pnl, rMultiple: row.r_multiple })),
    rangeTruncated,
  )

  return {
    accounts,
    filters: { ...filters, page },
    baseline,
    metrics,
    equity,
    daily,
    ledger: {
      rows: ledgerRows,
      total,
      page,
      pageSize: filters.pageSize,
      pageCount,
    },
    timeZone: TRADING_TIME_ZONE,
    truncated: rangeTruncated || dailyTruncated,
    generatedAt: new Date().toISOString(),
  }
}
