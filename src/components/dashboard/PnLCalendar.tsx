'use client'

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  WEEKDAY_LABELS,
  addMonthsToMonthKey,
  formatDateKey,
  formatMonthLabel,
  getMonthMatrix,
  monthKeyFromDateKey,
  todayKey,
} from '@/lib/date'
import { summarizeMonth } from '@/lib/finance'
import {
  formatSignedCompactCurrency,
  formatSignedCurrency,
  pnlTextClass,
} from '@/lib/format'
import type { DailyPnl } from '@/lib/journal/types'
import { cn } from '@/lib/utils'

function defaultMonth(daily: DailyPnl[], timeZone: string): string {
  const latest = daily[daily.length - 1]
  return monthKeyFromDateKey(latest?.dateKey ?? todayKey(timeZone))
}

function cellBackground(netPnl: number, maxAbs: number): CSSProperties | undefined {
  if (netPnl === 0) return undefined
  const intensity = maxAbs > 0 ? Math.min(1, Math.abs(netPnl) / maxAbs) : 0
  const alpha = 0.12 + intensity * 0.28
  return {
    backgroundColor:
      netPnl > 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(244, 63, 94, ${alpha})`,
  }
}

export function PnLCalendar({
  daily,
  selectedDate,
  onSelectDate,
  timeZone,
}: {
  daily: DailyPnl[]
  selectedDate: string | null
  onSelectDate: (dateKey: string) => void
  timeZone: string
}) {
  const [monthKey, setMonthKey] = useState(() => defaultMonth(daily, timeZone))

  useEffect(() => {
    setMonthKey((current) => {
      if (daily.length === 0) return current
      const hasData = daily.some((day) => day.dateKey.startsWith(`${current}-`))
      return hasData ? current : defaultMonth(daily, timeZone)
    })
  }, [daily, timeZone])

  const dailyMap = useMemo(
    () => new Map(daily.map((day) => [day.dateKey, day])),
    [daily],
  )
  const summary = useMemo(() => summarizeMonth(daily, monthKey), [daily, monthKey])
  const cells = useMemo(() => getMonthMatrix(monthKey), [monthKey])
  const maxAbs = useMemo(
    () =>
      Math.max(
        0,
        ...daily
          .filter((day) => day.dateKey.startsWith(`${monthKey}-`))
          .map((day) => Math.abs(day.netPnl)),
      ),
    [daily, monthKey],
  )

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>P&L calendar</CardTitle>
            <CardDescription>Daily realized net P&L.</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous month"
              onClick={() => setMonthKey((current) => addMonthsToMonthKey(current, -1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setMonthKey(monthKeyFromDateKey(todayKey(timeZone)))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Next month"
              onClick={() => setMonthKey((current) => addMonthsToMonthKey(current, 1))}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold">{formatMonthLabel(monthKey)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{summary.tradingDays} days</Badge>
            <Badge variant="outline">{summary.tradeCount} trades</Badge>
            <span
              className={cn(
                'text-sm font-semibold tabular',
                pnlTextClass(summary.netPnl),
              )}
            >
              {formatSignedCurrency(summary.netPnl)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <div className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const day = dailyMap.get(cell.dateKey)
            const isSelected = selectedDate === cell.dateKey
            const inMonth = cell.inMonth

            return (
              <button
                key={cell.dateKey}
                type="button"
                disabled={!day || !inMonth}
                onClick={() => onSelectDate(cell.dateKey)}
                aria-label={
                  day
                    ? `${formatDateKey(cell.dateKey)}: ${formatSignedCurrency(day.netPnl)} across ${day.tradeCount} trades`
                    : `${formatDateKey(cell.dateKey)}: no trades`
                }
                aria-pressed={isSelected}
                style={inMonth && day ? cellBackground(day.netPnl, maxAbs) : undefined}
                className={cn(
                  'group relative flex min-h-[58px] flex-col rounded-md border border-transparent p-1.5 text-left transition sm:min-h-[66px]',
                  inMonth ? 'bg-muted/25' : 'pointer-events-none opacity-0',
                  day && inMonth
                    ? 'cursor-pointer hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    : 'cursor-default',
                  isSelected && 'border-primary ring-1 ring-primary',
                )}
              >
                <span
                  className={cn(
                    'text-[10px] font-medium tabular',
                    isSelected ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {cell.day}
                </span>
                {day ? (
                  <>
                    <span
                      className={cn(
                        'mt-auto truncate text-[11px] font-semibold tabular sm:text-xs',
                        pnlTextClass(day.netPnl),
                      )}
                    >
                      {formatSignedCompactCurrency(day.netPnl)}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {day.tradeCount} trade{day.tradeCount === 1 ? '' : 's'}
                    </span>
                  </>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Profit
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
              Loss
            </span>
          </div>
          {summary.bestDay && summary.worstDay ? (
            <p className="tabular">
              Best {formatSignedCompactCurrency(summary.bestDay.netPnl)} · Worst{' '}
              {formatSignedCompactCurrency(summary.worstDay.netPnl)}
            </p>
          ) : (
            <p>No trades this month</p>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Select a day to filter the ledger to that session.
        </p>
      </CardContent>
    </Card>
  )
}
