'use client'

import {
  CalendarRange,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { formatDateKey } from '@/lib/date'
import {
  hasActiveFilters,
  sanitizeSymbol,
} from '@/lib/journal/filters'
import type {
  AccountOption,
  DateRangePreset,
  TradeFilters,
} from '@/lib/journal/types'
import { cn } from '@/lib/utils'

const PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: 'all', label: 'All' },
]

export function FilterBar({
  filters,
  accounts,
  isPending,
  resultCount,
  symbolValue,
  onSymbolChange,
  onApply,
  onPreset,
  onReset,
}: {
  filters: TradeFilters
  accounts: AccountOption[]
  isPending: boolean
  resultCount: number
  symbolValue: string
  onSymbolChange: (value: string) => void
  onApply: (patch: Partial<TradeFilters>) => void
  onPreset: (preset: DateRangePreset) => void
  onReset: () => void
}) {
  const active = hasActiveFilters(filters)
  const selectedDay =
    filters.from && filters.to && filters.from === filters.to ? filters.from : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <CardTitle>Filters</CardTitle>
            <CardDescription className="hidden sm:block">
              {resultCount.toLocaleString('en-US')} closed trade
              {resultCount === 1 ? '' : 's'} in view
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Updating
              </span>
            ) : null}
            <div className="hidden items-center gap-1 sm:flex">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground"
                  onClick={() => onPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!active || isPending}
              onClick={onReset}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          </div>
        </div>

        {selectedDay ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="default">
              <CalendarRange className="h-3 w-3" aria-hidden="true" />
              {formatDateKey(selectedDay)}
            </Badge>
            <button
              type="button"
              onClick={() => onApply({ from: null, to: null })}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear day
            </button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="filter-from">From</Label>
            <Input
              id="filter-from"
              type="date"
              value={filters.from ?? ''}
              max={filters.to ?? undefined}
              onChange={(event) =>
                onApply({ from: event.target.value || null })
              }
            />
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="filter-to">To</Label>
            <Input
              id="filter-to"
              type="date"
              value={filters.to ?? ''}
              min={filters.from ?? undefined}
              onChange={(event) => onApply({ to: event.target.value || null })}
            />
          </div>

          <div className="space-y-1.5 lg:col-span-3">
            <Label htmlFor="filter-account">Account</Label>
            <Select
              id="filter-account"
              value={filters.accountId ?? ''}
              onChange={(event) =>
                onApply({ accountId: event.target.value || null })
              }
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.broker ? ` · ${account.broker}` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="filter-symbol">Symbol</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="filter-symbol"
                value={symbolValue}
                placeholder="Search ticker…"
                autoComplete="off"
                spellCheck={false}
                className={cn('pl-9', symbolValue ? 'pr-8' : '')}
                onChange={(event) => onSymbolChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    onApply({ symbol: sanitizeSymbol(symbolValue) })
                  }
                }}
              />
              {symbolValue ? (
                <button
                  type="button"
                  aria-label="Clear symbol search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onSymbolChange('')
                    onApply({ symbol: '' })
                  }}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="filter-direction">Direction</Label>
            <Select
              id="filter-direction"
              value={filters.direction ?? ''}
              onChange={(event) =>
                onApply({
                  direction:
                    event.target.value === 'long' || event.target.value === 'short'
                      ? event.target.value
                      : null,
                })
              }
            >
              <option value="">All</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 sm:hidden">
          <div className="flex flex-wrap items-center gap-1">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => onPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
