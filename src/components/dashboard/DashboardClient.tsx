'use client'

import { AlertCircle, Loader2, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { fetchJournalSnapshot } from '@/app/actions/journal'
import { EquityCurve } from '@/components/dashboard/EquityCurve'
import { FilterBar } from '@/components/dashboard/FilterBar'
import { KPISummary } from '@/components/dashboard/KPISummary'
import { PnLCalendar } from '@/components/dashboard/PnLCalendar'
import { TradeDetailDrawer } from '@/components/trades/TradeDetailDrawer'
import { TradeLedger } from '@/components/trades/TradeLedger'
import { Button } from '@/components/ui/button'
import {
  formatDateKey,
  formatTimeInTimeZone,
  getDateRangePreset,
} from '@/lib/date'
import {
  DEFAULT_FILTERS,
  sanitizeSymbol,
  selectedDayFromFilters,
} from '@/lib/journal/filters'
import type {
  DateRangePreset,
  JournalSnapshot,
  LedgerTrade,
  TradeFilters,
  UpdatedTrade,
} from '@/lib/journal/types'

function rangeLabel(filters: TradeFilters): string {
  if (filters.from && filters.to) {
    return filters.from === filters.to
      ? formatDateKey(filters.from)
      : `${formatDateKey(filters.from)} – ${formatDateKey(filters.to)}`
  }
  if (filters.from) return `From ${formatDateKey(filters.from)}`
  if (filters.to) return `Through ${formatDateKey(filters.to)}`
  return 'All time'
}

function timeZoneLabel(timeZone: string): string {
  const city = timeZone.split('/').pop() ?? timeZone
  return city.replace(/_/g, ' ')
}

export function DashboardClient({ initialData }: { initialData: JournalSnapshot }) {
  const [data, setData] = useState<JournalSnapshot>(initialData)
  const [filters, setFilters] = useState<TradeFilters>(initialData.filters)
  const [symbolInput, setSymbolInput] = useState(initialData.filters.symbol)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const requestRef = useRef(0)

  const load = useCallback(
    (next: TradeFilters) => {
      const requestId = requestRef.current + 1
      requestRef.current = requestId
      startTransition(async () => {
        const result = await fetchJournalSnapshot(next)
        if (requestRef.current !== requestId) return
        if (!result.ok) {
          setError(result.error)
          return
        }
        setData(result.data)
        setFilters(result.data.filters)
        setError(null)
      })
    },
    [startTransition],
  )

  useEffect(() => {
    const normalized = sanitizeSymbol(symbolInput)
    if (normalized === filters.symbol) return
    const timer = setTimeout(() => {
      const next = { ...filters, symbol: normalized, page: 1 }
      setFilters(next)
      load(next)
    }, 350)
    return () => clearTimeout(timer)
  }, [symbolInput, filters, load])

  const applyFilters = useCallback(
    (patch: Partial<TradeFilters>) => {
      const next = { ...filters, ...patch, page: patch.page ?? 1 }
      setError(null)
      setFilters(next)
      load(next)
    },
    [filters, load],
  )

  const handlePreset = useCallback(
    (preset: DateRangePreset) => {
      applyFilters(getDateRangePreset(preset, data.timeZone))
    },
    [applyFilters, data.timeZone],
  )

  const handleReset = useCallback(() => {
    setSymbolInput('')
    setSelectedTradeId(null)
    setError(null)
    setFilters({ ...DEFAULT_FILTERS })
    load({ ...DEFAULT_FILTERS })
  }, [load])

  const handleSelectDay = useCallback(
    (dateKey: string) => {
      const selected = selectedDayFromFilters(filters)
      if (selected === dateKey) {
        applyFilters({ from: null, to: null })
      } else {
        applyFilters({ from: dateKey, to: dateKey })
      }
    },
    [applyFilters, filters],
  )

  const handleSelectTrade = useCallback((trade: LedgerTrade) => {
    setSelectedTradeId(trade.id)
  }, [])

  const handleSaved = useCallback(
    (updated: UpdatedTrade) => {
      setData((previous) => ({
        ...previous,
        ledger: {
          ...previous.ledger,
          rows: previous.ledger.rows.map((row) =>
            row.id === updated.id
              ? {
                  ...row,
                  notes: updated.notes,
                  initialRiskAmount: updated.initialRiskAmount,
                  rMultiple: updated.rMultiple,
                  tags: updated.tags,
                }
              : row,
          ),
        },
      }))
      load(filters)
    },
    [filters, load],
  )

  const selectedTrade =
    data.ledger.rows.find((row) => row.id === selectedTradeId) ?? null

  return (
    <>
      {isPending ? (
        <div
          className="fixed inset-x-0 top-14 z-30 h-0.5 overflow-hidden bg-primary/10"
          aria-hidden="true"
        >
          <div className="h-full w-1/3 animate-progress-indeterminate bg-primary" />
        </div>
      ) : null}

      <main className="container space-y-4 py-6" aria-busy={isPending}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Performance desk
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Trading journal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {rangeLabel(filters)}
              <span className="mx-1.5 text-border">|</span>
              Times in {timeZoneLabel(data.timeZone)}
              <span className="mx-1.5 text-border">|</span>
              Updated {formatTimeInTimeZone(data.generatedAt, data.timeZone)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Refreshing
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => load(filters)}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </span>
            <button
              type="button"
              aria-label="Dismiss error"
              className="rounded-sm p-0.5 opacity-70 transition-opacity hover:opacity-100"
              onClick={() => setError(null)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <FilterBar
          filters={filters}
          accounts={data.accounts}
          isPending={isPending}
          resultCount={data.ledger.total}
          symbolValue={symbolInput}
          onSymbolChange={setSymbolInput}
          onApply={applyFilters}
          onPreset={handlePreset}
          onReset={handleReset}
        />

        <KPISummary metrics={data.metrics} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <EquityCurve equity={data.equity} timeZone={data.timeZone} />
          <PnLCalendar
            daily={data.daily}
            selectedDate={selectedDayFromFilters(filters)}
            onSelectDate={handleSelectDay}
            timeZone={data.timeZone}
          />
        </div>

        <TradeLedger
          ledger={data.ledger}
          timeZone={data.timeZone}
          isPending={isPending}
          selectedTradeId={selectedTradeId}
          onSelectTrade={handleSelectTrade}
          onPageChange={(page) => applyFilters({ page })}
          onPageSizeChange={(pageSize) => applyFilters({ page: 1, pageSize })}
          onResetFilters={handleReset}
        />
      </main>

      <TradeDetailDrawer
        trade={selectedTrade}
        timeZone={data.timeZone}
        onClose={() => setSelectedTradeId(null)}
        onSaved={handleSaved}
      />
    </>
  )
}
