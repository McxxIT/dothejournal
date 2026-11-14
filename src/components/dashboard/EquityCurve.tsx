'use client'

import { LineChart } from 'lucide-react'
import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDateKey, toDateKey } from '@/lib/date'
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  pnlTextClass,
} from '@/lib/format'
import type { EquityPoint, EquitySnapshot } from '@/lib/journal/types'
import { cn } from '@/lib/utils'

interface EquityTooltipProps {
  active?: boolean
  payload?: Array<{ payload?: EquityPoint }>
}

function EquityTooltip({ active, payload }: EquityTooltipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="min-w-[190px] rounded-lg border border-border bg-popover p-3 text-xs shadow-lg">
      <p className="font-medium text-foreground">{formatDateKey(point.dateKey)}</p>
      <dl className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Equity</dt>
          <dd className="font-medium tabular">{formatCurrency(point.equity)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Cumulative</dt>
          <dd className={cn('font-medium tabular', pnlTextClass(point.cumulativePnl))}>
            {formatSignedCurrency(point.cumulativePnl)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Drawdown</dt>
          <dd className={cn('font-medium tabular', pnlTextClass(point.drawdown))}>
            {formatSignedCurrency(point.drawdown)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function Stat({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-0.5 text-sm font-semibold tabular', className)}>{value}</p>
    </div>
  )
}

export function EquityCurve({
  equity,
  timeZone,
}: {
  equity: EquitySnapshot
  timeZone: string
}) {
  const chartData = useMemo(() => equity.points, [equity.points])
  const hasData = equity.points.length > 1

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Equity curve</CardTitle>
          <CardDescription>
            Cumulative net P&L by exit time, measured against your starting balance.
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Current equity
          </p>
          <p className="text-lg font-semibold tabular">
            {formatCurrency(equity.currentEquity)}
          </p>
          <p
            className={cn(
              'text-[11px] font-medium tabular',
              pnlTextClass(equity.netPnl),
            )}
          >
            {formatSignedCurrency(equity.netPnl)}
            {equity.totalReturnPct !== null
              ? ` · ${equity.totalReturnPct >= 0 ? '+' : ''}${formatPercent(equity.totalReturnPct)}`
              : ''}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-1">
        {hasData ? (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value: number) =>
                    formatDateKey(toDateKey(new Date(value), timeZone), {
                      includeYear: false,
                    })
                  }
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  minTickGap={42}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCompactCurrency(value)}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  width={64}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<EquityTooltip />}
                  cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
                />
                <ReferenceLine
                  y={equity.baseline}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  label={{
                    value: 'Starting balance',
                    position: 'insideTopRight',
                    fill: '#94a3b8',
                    fontSize: 10,
                  }}
                />
                {equity.peak && equity.trough ? (
                  <ReferenceArea
                    x1={equity.peak.ts}
                    x2={equity.trough.ts}
                    fill="#f43f5e"
                    fillOpacity={0.07}
                  />
                ) : null}
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#equityFill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#10b981' }}
                  isAnimationActive={false}
                />
                {equity.peak ? (
                  <ReferenceDot
                    x={equity.peak.ts}
                    y={equity.peak.equity}
                    r={4}
                    fill="#f59e0b"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                ) : null}
                {equity.trough ? (
                  <ReferenceDot
                    x={equity.trough.ts}
                    y={equity.trough.equity}
                    r={4}
                    fill="#f43f5e"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-center">
            <LineChart className="mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No equity history yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Close a trade or widen the filters to plot your equity curve.
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
          <Stat
            label="Net P&L"
            value={formatSignedCurrency(equity.netPnl)}
            className={pnlTextClass(equity.netPnl)}
          />
          <Stat
            label="Return"
            value={
              equity.totalReturnPct === null
                ? '—'
                : `${equity.totalReturnPct >= 0 ? '+' : ''}${formatPercent(equity.totalReturnPct)}`
            }
            className={pnlTextClass(equity.totalReturnPct)}
          />
          <Stat
            label="Max drawdown"
            value={formatSignedCurrency(equity.maxDrawdown)}
            className={pnlTextClass(equity.maxDrawdown)}
          />
          <Stat
            label="Drawdown %"
            value={formatPercent(equity.maxDrawdownPct)}
            className={pnlTextClass(equity.maxDrawdownPct)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
