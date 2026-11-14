'use client'

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileX2,
  ListFilter,
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
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateKey, formatTimeInTimeZone, toDateKey } from '@/lib/date'
import {
  formatRatio,
  formatSignedCurrency,
  pnlTextClass,
} from '@/lib/format'
import { PAGE_SIZE_OPTIONS } from '@/lib/journal/filters'
import type { LedgerPage, LedgerTrade } from '@/lib/journal/types'
import { cn } from '@/lib/utils'

export function TradeLedger({
  ledger,
  timeZone,
  isPending,
  selectedTradeId,
  onSelectTrade,
  onPageChange,
  onPageSizeChange,
  onResetFilters,
}: {
  ledger: LedgerPage
  timeZone: string
  isPending: boolean
  selectedTradeId: string | null
  onSelectTrade: (trade: LedgerTrade) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onResetFilters: () => void
}) {
  const firstRow =
    ledger.total === 0 ? 0 : (ledger.page - 1) * ledger.pageSize + 1
  const lastRow = Math.min(ledger.page * ledger.pageSize, ledger.total)

  return (
    <Card aria-busy={isPending}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Trade ledger</CardTitle>
            <CardDescription>
              {ledger.total.toLocaleString('en-US')} closed trade
              {ledger.total === 1 ? '' : 's'} · newest exits first
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <ListFilter className="h-3 w-3" aria-hidden="true" />
            Page {ledger.page} of {ledger.pageCount}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[150px] pl-5">Date</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead className="hidden md:table-cell">Account</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Net P&L</TableHead>
                <TableHead className="text-right">R-Multiple</TableHead>
                <TableHead className="w-[90px] pr-5 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={cn('transition-opacity', isPending && 'opacity-50')}>
              {ledger.rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-14">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                        <FileX2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="text-sm font-medium">No trades match these filters</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Adjust the date range, account, symbol, or direction to find
                        closed trades.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={onResetFilters}
                      >
                        Reset filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                ledger.rows.map((trade) => {
                  const isSelected = selectedTradeId === trade.id
                  const isLong = trade.direction === 'long'
                  return (
                    <TableRow
                      key={trade.id}
                      tabIndex={0}
                      aria-label={`Open ${trade.symbol} trade details`}
                      data-state={isSelected ? 'selected' : undefined}
                      className="group cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
                      onClick={() => onSelectTrade(trade)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectTrade(trade)
                        }
                      }}
                    >
                      <TableCell className="pl-5">
                        <div className="text-xs font-medium">
                          {formatDateKey(toDateKey(trade.exitTime, timeZone))}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatTimeInTimeZone(trade.exitTime, timeZone)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold tracking-tight">
                          {trade.symbol}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {trade.assetClass}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {trade.accountName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isLong ? 'success' : 'danger'}>
                          {isLong ? (
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                          )}
                          {isLong ? 'Long' : 'Short'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'text-sm font-semibold tabular',
                            pnlTextClass(trade.netPnl),
                          )}
                        >
                          {formatSignedCurrency(trade.netPnl)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'text-xs font-medium tabular',
                            pnlTextClass(trade.rMultiple),
                          )}
                        >
                          {trade.rMultiple === null
                            ? '—'
                            : `${formatRatio(trade.rMultiple)}R`}
                        </span>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-muted-foreground group-hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation()
                            onSelectTrade(trade)
                          }}
                        >
                          View
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
          <div className="flex items-center gap-3">
            <p className="text-[11px] tabular text-muted-foreground">
              Showing {firstRow.toLocaleString('en-US')}–
              {lastRow.toLocaleString('en-US')} of{' '}
              {ledger.total.toLocaleString('en-US')}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Rows</span>
              <div className="w-[76px]">
                <Select
                  aria-label="Rows per page"
                  className="h-7 text-xs"
                  value={ledger.pageSize}
                  onChange={(event) => onPageSizeChange(Number(event.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={ledger.page <= 1 || isPending}
              onClick={() => onPageChange(ledger.page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Prev
            </Button>
            <span className="px-2 text-[11px] tabular text-muted-foreground">
              {ledger.page} / {ledger.pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={ledger.page >= ledger.pageCount || isPending}
              onClick={() => onPageChange(ledger.page + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
