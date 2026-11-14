import { Percent, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  formatSignedCurrency,
  pnlTextClass,
} from '@/lib/format'
import type { DashboardMetrics } from '@/lib/journal/types'
import { cn } from '@/lib/utils'

function profitFactorLabel(metrics: DashboardMetrics): string {
  if (metrics.totalTrades === 0) return '—'
  if (metrics.grossLoss === 0) return metrics.grossProfit > 0 ? '∞' : '—'
  return formatRatio(metrics.profitFactor)
}

export function KPISummary({ metrics }: { metrics: DashboardMetrics }) {
  const netPositive = metrics.netPnl >= 0
  const winRate = metrics.winRate ?? 0

  const cards = [
    {
      label: 'Net P&L',
      value: formatSignedCurrency(metrics.netPnl),
      valueClass: pnlTextClass(metrics.netPnl),
      icon: netPositive ? TrendingUp : TrendingDown,
      iconClass: netPositive
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      footer:
        metrics.expectancy === null
          ? 'No closed trades in range'
          : `${formatSignedCurrency(metrics.expectancy)} expectancy / trade`,
    },
    {
      label: 'Win Rate',
      value: formatPercent(metrics.winRate),
      valueClass: 'text-foreground',
      icon: Percent,
      iconClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      footer: `${metrics.winningTrades}W · ${metrics.losingTrades}L · ${metrics.breakevenTrades}BE`,
      progress: winRate,
    },
    {
      label: 'Profit Factor',
      value: profitFactorLabel(metrics),
      valueClass:
        metrics.totalTrades > 0 && metrics.grossLoss === 0 && metrics.grossProfit > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : metrics.profitFactor !== null && metrics.profitFactor >= 1
            ? 'text-emerald-600 dark:text-emerald-400'
            : metrics.profitFactor !== null
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-foreground',
      icon: Scale,
      iconClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      footer: `${formatCurrency(metrics.grossProfit)} won / ${formatCurrency(Math.abs(metrics.grossLoss))} lost`,
    },
    {
      label: 'Total Trades',
      value: metrics.totalTrades.toLocaleString('en-US'),
      valueClass: 'text-foreground',
      icon: Wallet,
      iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      footer:
        metrics.avgR === null
          ? 'Avg R not available'
          : `${formatRatio(metrics.avgR)}R average across closed trades`,
    },
  ]

  return (
    <section aria-label="Key performance indicators" className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        'mt-2 truncate text-2xl font-semibold tabular tracking-tight',
                        card.valueClass,
                      )}
                    >
                      {card.value}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                      card.iconClass,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>

                {'progress' in card && card.progress !== undefined ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-[width] duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                    />
                  </div>
                ) : null}

                <p className="mt-2 truncate text-[11px] text-muted-foreground">
                  {card.footer}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {metrics.truncated ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          Showing metrics for the most recent 10,000 closed trades in range.
        </p>
      ) : null}
    </section>
  )
}
