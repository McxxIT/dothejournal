'use client'

import { ArrowDownRight, ArrowUpRight, Check, Loader2, Plus, X } from 'lucide-react'
import { useState, useTransition, type FormEvent, type KeyboardEvent } from 'react'
import { updateTradeDetails } from '@/app/actions/journal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTimeInTimeZone } from '@/lib/date'
import { computeRMultiple } from '@/lib/finance'
import {
  formatPrice,
  formatQuantity,
  formatRatio,
  formatSignedCurrency,
  pnlTextClass,
} from '@/lib/format'
import type { LedgerTrade, UpdatedTrade } from '@/lib/journal/types'
import { cn } from '@/lib/utils'

const MAX_TAGS = 20
const MAX_TAG_LENGTH = 32
const MAX_NOTES_LENGTH = 10_000

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH)
}

function addTag(tags: string[], raw: string): string[] {
  const tag = normalizeTag(raw)
  if (!tag) return tags
  if (tags.length >= MAX_TAGS) return tags
  if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return tags
  return [...tags, tag]
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
    <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={cn('mt-0.5 text-sm font-semibold tabular', className)}>{value}</dd>
    </div>
  )
}

function TradeDetailForm({
  trade,
  timeZone,
  onSaved,
}: {
  trade: LedgerTrade
  timeZone: string
  onSaved: (trade: UpdatedTrade) => void
}) {
  const [notes, setNotes] = useState(trade.notes ?? '')
  const [risk, setRisk] = useState(
    trade.initialRiskAmount === null ? '' : String(trade.initialRiskAmount),
  )
  const [tags, setTags] = useState<string[]>(trade.tags)
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isLong = trade.direction === 'long'
  const riskValue = risk.trim() === '' ? null : Number(risk)
  const riskIsValid =
    riskValue === null || (Number.isFinite(riskValue) && riskValue >= 0)
  const previewR = riskIsValid ? computeRMultiple(trade.netPnl, riskValue) : null

  const initialRisk = trade.initialRiskAmount === null ? '' : String(trade.initialRiskAmount)
  const tagsMatch =
    tags.length === trade.tags.length &&
    tags.every((tag, index) => tag === trade.tags[index])
  const dirty =
    notes !== (trade.notes ?? '') || risk !== initialRisk || !tagsMatch

  function commitTag(raw: string) {
    const next = addTag(tags, raw)
    if (next !== tags) {
      setTags(next)
      setTagInput('')
      setSaved(false)
    }
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commitTag(tagInput)
    } else if (event.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1))
      setSaved(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    if (!riskIsValid) {
      setError('Initial risk must be a positive number or left blank.')
      return
    }

    startTransition(async () => {
      const result = await updateTradeDetails({
        tradeId: trade.id,
        notes,
        initialRiskAmount: riskValue,
        tags,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      setSaved(true)
      onSaved(result.trade)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="border-b border-border/60 px-6 pb-4 pr-12 pt-5">
        <SheetTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono tracking-tight">{trade.symbol}</span>
          <Badge variant={isLong ? 'success' : 'danger'}>
            {isLong ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
            )}
            {isLong ? 'Long' : 'Short'}
          </Badge>
          <Badge variant="outline">{trade.assetClass}</Badge>
        </SheetTitle>
        <SheetDescription className="mt-1">
          {trade.accountName} · Closed {formatDateTimeInTimeZone(trade.exitTime, timeZone)}
        </SheetDescription>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin px-6 py-5">
        <section aria-label="Trade execution details">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Execution
          </h3>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Entry" value={formatPrice(trade.avgEntryPrice)} />
            <Stat label="Exit" value={formatPrice(trade.avgExitPrice)} />
            <Stat label="Quantity" value={formatQuantity(trade.totalQuantity)} />
            <Stat label="Gross P&L" value={formatSignedCurrency(trade.grossPnl)} className={pnlTextClass(trade.grossPnl)} />
            <Stat label="Fees" value={formatPrice(trade.fees)} />
            <Stat
              label="Net P&L"
              value={formatSignedCurrency(trade.netPnl)}
              className={pnlTextClass(trade.netPnl)}
            />
            <Stat
              label="R-Multiple"
              value={trade.rMultiple === null ? '—' : `${formatRatio(trade.rMultiple)}R`}
              className={pnlTextClass(trade.rMultiple)}
            />
            <Stat
              label="Opened"
              value={formatDateTimeInTimeZone(trade.entryTime, timeZone)}
            />
            <Stat
              label="Closed"
              value={formatDateTimeInTimeZone(trade.exitTime, timeZone)}
            />
          </dl>
        </section>

        <section aria-label="Journal entry" className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Journal
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="trade-risk">Initial risk (USD)</Label>
            <Input
              id="trade-risk"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={risk}
              placeholder="0.00"
              onChange={(event) => {
                setRisk(event.target.value)
                setSaved(false)
              }}
              aria-invalid={!riskIsValid}
              className={cn(!riskIsValid && 'border-destructive focus-visible:ring-destructive')}
            />
            <p className="text-[11px] text-muted-foreground">
              R is recalculated deterministically as net P&L ÷ initial risk.
              {previewR === null ? ' No R value without risk.' : ` Current preview: ${formatRatio(previewR)}R.`}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="trade-notes">Notes</Label>
              <span className="text-[10px] tabular text-muted-foreground">
                {notes.length.toLocaleString('en-US')} / {MAX_NOTES_LENGTH.toLocaleString('en-US')}
              </span>
            </div>
            <Textarea
              id="trade-notes"
              value={notes}
              maxLength={MAX_NOTES_LENGTH}
              placeholder="Setup, execution quality, emotional state, lessons…"
              className="min-h-[130px] resize-y"
              onChange={(event) => {
                setNotes(event.target.value)
                setSaved(false)
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trade-tags">Tags</Label>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove ${tag} tag`}
                      className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => {
                        setTags(tags.filter((item) => item !== tag))
                        setSaved(false)
                      }}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input
                id="trade-tags"
                value={tagInput}
                maxLength={MAX_TAG_LENGTH}
                placeholder="Add a tag and press Enter…"
                disabled={tags.length >= MAX_TAGS}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Add tag"
                disabled={!tagInput.trim() || tags.length >= MAX_TAGS}
                onClick={() => commitTag(tagInput)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Up to {MAX_TAGS} tags. Press Enter or comma to add.
            </p>
          </div>
        </section>
      </div>

      <div className="border-t border-border/60 bg-background px-6 py-4">
        {error ? (
          <p
            role="alert"
            className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Changes saved
              </>
            ) : null}
          </span>
          <div className="flex items-center gap-2">
            <SheetClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isPending || !dirty}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

export function TradeDetailDrawer({
  trade,
  timeZone,
  onClose,
  onSaved,
}: {
  trade: LedgerTrade | null
  timeZone: string
  onClose: () => void
  onSaved: (trade: UpdatedTrade) => void
}) {
  return (
    <Sheet
      open={trade !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent className="sm:max-w-xl">
        {trade ? (
          <TradeDetailForm
            key={trade.id}
            trade={trade}
            timeZone={timeZone}
            onSaved={onSaved}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
