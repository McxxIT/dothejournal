import { Activity } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Activity className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold tracking-tight">dothejournal</span>
    </Link>
  )
}
