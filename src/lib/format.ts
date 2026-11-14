import { roundMoney } from '@/lib/finance'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const quantityFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
})

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return currencyFormatter.format(roundMoney(value))
}

export function formatSignedCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const rounded = roundMoney(value)
  if (rounded > 0) return `+${currencyFormatter.format(rounded)}`
  if (rounded < 0) return `-${currencyFormatter.format(Math.abs(rounded))}`
  return currencyFormatter.format(0)
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return compactCurrencyFormatter.format(value)
}

export function formatSignedCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const rounded = roundMoney(value)
  if (rounded > 0) return `+${compactCurrencyFormatter.format(rounded)}`
  if (rounded < 0) return `-${compactCurrencyFormatter.format(Math.abs(rounded))}`
  return compactCurrencyFormatter.format(0)
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toFixed(digits)
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const fractionDigits = Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return quantityFormatter.format(value)
}

export function pnlTextClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return 'text-muted-foreground'
  return value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
}

export function pnlBgClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return 'bg-muted/40'
  return value > 0
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
}
