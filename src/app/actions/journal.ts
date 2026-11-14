'use server'

import { revalidatePath } from 'next/cache'
import { computeRMultiple } from '@/lib/finance'
import { parseFilters } from '@/lib/journal/filters'
import { getJournalSnapshot, getViewer, UnauthorizedError } from '@/lib/journal/queries'
import type { JournalActionResult, UpdateTradeResult } from '@/lib/journal/types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAX_NOTES_LENGTH = 10_000
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 32
const MAX_INITIAL_RISK = 1_000_000_000_000

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const tags: string[] = []

  for (const item of input) {
    if (typeof item !== 'string') continue
    const tag = item.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
    if (tags.length >= MAX_TAGS) break
  }

  return tags
}

function normalizeRisk(input: unknown): number | null | 'invalid' {
  if (input === null || input === undefined || input === '') return null
  const parsed = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_INITIAL_RISK) return 'invalid'
  return Math.round(parsed * 100) / 100
}

export async function fetchJournalSnapshot(input: unknown): Promise<JournalActionResult> {
  try {
    const snapshot = await getJournalSnapshot(parseFilters(input))
    return { ok: true, data: snapshot }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: error.message }
    }
    console.error('[dothejournal] Failed to fetch journal snapshot', error)
    return { ok: false, error: 'Unable to load journal data. Please try again.' }
  }
}

export async function updateTradeDetails(input: unknown): Promise<UpdateTradeResult> {
  let viewer: Awaited<ReturnType<typeof getViewer>>
  try {
    viewer = await getViewer()
  } catch (error) {
    console.error('[dothejournal] Failed to resolve viewer before update', error)
    return { ok: false, error: 'Unable to save changes right now. Please try again.' }
  }

  if (!viewer) {
    return { ok: false, error: 'Your session has expired. Sign in again to continue.' }
  }

  if (input === null || typeof input !== 'object') {
    return { ok: false, error: 'Invalid trade update.' }
  }

  const payload = input as Record<string, unknown>
  const tradeId = typeof payload.tradeId === 'string' ? payload.tradeId : ''

  if (!UUID_PATTERN.test(tradeId)) {
    return { ok: false, error: 'Invalid trade identifier.' }
  }

  const risk = normalizeRisk(payload.initialRiskAmount)
  if (risk === 'invalid') {
    return { ok: false, error: 'Initial risk must be zero or greater.' }
  }

  const rawNotes = typeof payload.notes === 'string' ? payload.notes : ''
  const notes = rawNotes.trim() ? rawNotes.trim().slice(0, MAX_NOTES_LENGTH) : null
  const tags = normalizeTags(payload.tags)

  const { data: existing, error: readError } = await viewer.supabase
    .from('trades')
    .select('id,net_pnl')
    .eq('id', tradeId)
    .eq('user_id', viewer.user.id)
    .maybeSingle()

  if (readError) {
    console.error('[dothejournal] Failed to read trade before update', readError)
    return { ok: false, error: 'Could not load this trade. Please try again.' }
  }

  if (!existing) {
    return { ok: false, error: 'Trade not found or you do not have access to it.' }
  }

  const rMultiple = computeRMultiple(existing.net_pnl, risk)

  const { data: updated, error: updateError } = await viewer.supabase
    .from('trades')
    .update({
      notes,
      initial_risk_amount: risk,
      tags,
      r_multiple: rMultiple,
    })
    .eq('id', tradeId)
    .eq('user_id', viewer.user.id)
    .select('id,notes,initial_risk_amount,r_multiple,tags')
    .maybeSingle()

  if (updateError) {
    console.error('[dothejournal] Failed to update trade', updateError)
    return { ok: false, error: 'Could not save your changes. Please try again.' }
  }

  if (!updated) {
    return { ok: false, error: 'Trade not found or you do not have access to it.' }
  }

  revalidatePath('/dashboard')

  return {
    ok: true,
    trade: {
      id: updated.id,
      notes: updated.notes,
      initialRiskAmount:
        updated.initial_risk_amount === null ? null : Number(updated.initial_risk_amount),
      rMultiple: updated.r_multiple === null ? null : Number(updated.r_multiple),
      tags: Array.isArray(updated.tags) ? updated.tags : [],
    },
  }
}
