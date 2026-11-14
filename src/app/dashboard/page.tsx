import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { AppHeader } from '@/components/layout/app-header'
import { DEFAULT_FILTERS } from '@/lib/journal/filters'
import { getJournalSnapshot, getViewer } from '@/lib/journal/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const viewer = await getViewer()
  if (!viewer) redirect('/login')

  const snapshot = await getJournalSnapshot(DEFAULT_FILTERS, viewer)

  return (
    <div className="min-h-screen bg-[radial-gradient(70%_45%_at_50%_-10%,hsl(var(--primary)/0.07),transparent_65%)]">
      <AppHeader email={viewer.user.email ?? null} />
      <DashboardClient initialData={snapshot} />
    </div>
  )
}
