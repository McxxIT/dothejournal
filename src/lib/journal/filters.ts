import { isValidDateKey, todayKey } from '@/lib/date'
import type { Direction, TradeFilters } from '@/lib/journal/types'

export const DEFAULT_PAGE_SIZE = 25
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const
export const MAX_SYMBOL_LENGTH = 32
export const MAX_ACCOUNT_ID_LENGTH = 64

export const DEFAULT_FILTERS: TradeFilters = {
  from: null,
  to: null,
  accountId: null,
  symbol: '',
  direction: null,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readDateKey(value: unknown): string | null {
  const raw = readString(value)
  if (!raw) return null
  const trimmed = raw.trim()
  return isValidDateKey(trimmed) ? trimmed : null
}

function readInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.trunc(parsed)
  return Math.min(max, Math.max(min, rounded))
}

export function sanitizeSymbol(value: string): string {
  return value
    .trim()
    .replace(/[%_\\]/g, '')
    .slice(0, MAX_SYMBOL_LENGTH)
}

export function parseFilters(input: unknown): TradeFilters {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {}

  let from = readDateKey(record.from)
  let to = readDateKey(record.to)

  if (from && to && from > to) {
    const swapped = from
    from = to
    to = swapped
  }

  const accountIdRaw = readString(record.accountId)?.trim() ?? ''
  const accountId = accountIdRaw ? accountIdRaw.slice(0, MAX_ACCOUNT_ID_LENGTH) : null

  const directionRaw = readString(record.direction)
  const direction: Direction | null =
    directionRaw === 'long' || directionRaw === 'short' ? directionRaw : null

  const page = readInteger(record.page, 1, 1, 100_000)
  const requestedPageSize = readInteger(record.pageSize, DEFAULT_PAGE_SIZE, 10, 100)
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE

  return {
    from,
    to,
    accountId,
    symbol: sanitizeSymbol(readString(record.symbol) ?? ''),
    direction,
    page,
    pageSize,
  }
}

export function hasActiveFilters(filters: TradeFilters): boolean {
  return Boolean(
    filters.from ||
      filters.to ||
      filters.accountId ||
      filters.symbol ||
      filters.direction,
  )
}

export function selectedDayFromFilters(filters: TradeFilters): string | null {
  if (filters.from && filters.to && filters.from === filters.to) return filters.from
  return null
}

export function defaultCalendarMonth(
  daily: { dateKey: string }[],
  timeZone: string,
): string {
  const latest = daily[daily.length - 1]
  return (latest?.dateKey ?? todayKey(timeZone)).slice(0, 7)
}
