import type { DateRangePreset } from '@/lib/journal/types'

export const TRADING_TIME_ZONE = 'America/New_York'

const DAY_MS = 86_400_000

const dateKeyFormatterCache = new Map<string, Intl.DateTimeFormat>()
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>()

function getDateKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateKeyFormatterCache.get(timeZone)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  dateKeyFormatterCache.set(timeZone, formatter)
  return formatter
}

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = offsetFormatterCache.get(timeZone)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  offsetFormatterCache.set(timeZone, formatter)
  return formatter
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function toDateKey(
  input: Date | string | number,
  timeZone: string = TRADING_TIME_ZONE,
): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot derive a date key from an invalid date')
  }
  const parts = getDateKeyFormatter(timeZone).formatToParts(date)
  let year = ''
  let month = ''
  let day = ''
  for (const part of parts) {
    if (part.type === 'year') year = part.value
    if (part.type === 'month') month = part.value
    if (part.type === 'day') day = part.value
  }
  return `${year}-${month}-${day}`
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function dateKeyToUtcMidnight(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function timeZoneOffsetMs(timestamp: number, timeZone: string): number {
  const parts = getOffsetFormatter(timeZone).formatToParts(new Date(timestamp))
  const values: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  )
  const floored = timestamp - (((timestamp % 1000) + 1000) % 1000)
  return asUtc - floored
}

export function startOfDayInTimeZone(
  dateKey: string,
  timeZone: string = TRADING_TIME_ZONE,
): Date {
  const utcMidnight = dateKeyToUtcMidnight(dateKey)
  const firstOffset = timeZoneOffsetMs(utcMidnight, timeZone)
  const candidate = utcMidnight - firstOffset
  const secondOffset = timeZoneOffsetMs(candidate, timeZone)
  return new Date(utcMidnight - secondOffset)
}

export function endOfDayInTimeZone(
  dateKey: string,
  timeZone: string = TRADING_TIME_ZONE,
): Date {
  const nextDay = addDaysToDateKey(dateKey, 1)
  return new Date(startOfDayInTimeZone(nextDay, timeZone).getTime() - 1)
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  return utcDateKey(new Date(dateKeyToUtcMidnight(dateKey) + days * DAY_MS))
}

export function todayKey(timeZone: string = TRADING_TIME_ZONE): string {
  return toDateKey(new Date(), timeZone)
}

export function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7)
}

export function addMonthsToMonthKey(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + months, 1))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

export function formatDateKey(
  dateKey: string,
  options: { includeYear?: boolean; includeWeekday?: boolean } = {},
): string {
  const { includeYear = true, includeWeekday = false } = options
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
    weekday: includeWeekday ? 'short' : undefined,
  }).format(new Date(dateKeyToUtcMidnight(dateKey)))
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function formatTimeInTimeZone(
  iso: string | null | undefined,
  timeZone: string = TRADING_TIME_ZONE,
): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatDateTimeInTimeZone(
  iso: string | null | undefined,
  timeZone: string = TRADING_TIME_ZONE,
): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export interface MonthCell {
  dateKey: string
  day: number
  inMonth: boolean
}

export function getMonthMatrix(monthKey: string, weekStartsOn = 0): MonthCell[] {
  const [year, month] = monthKey.split('-').map(Number)
  const firstKey = `${year}-${pad(month)}-01`
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const offset = (firstWeekday - weekStartsOn + 7) % 7
  const gridStart = addDaysToDateKey(firstKey, -offset)
  return Array.from({ length: 42 }, (_, index) => {
    const dateKey = addDaysToDateKey(gridStart, index)
    return {
      dateKey,
      day: Number(dateKey.slice(8, 10)),
      inMonth: dateKey.startsWith(`${year}-${pad(month)}`),
    }
  })
}

export function getDateRangePreset(
  preset: DateRangePreset,
  timeZone: string = TRADING_TIME_ZONE,
): { from: string | null; to: string | null } {
  const today = todayKey(timeZone)
  if (preset === 'all') return { from: null, to: null }
  if (preset === 'ytd') return { from: `${today.slice(0, 4)}-01-01`, to: today }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  return { from: addDaysToDateKey(today, -(days - 1)), to: today }
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
