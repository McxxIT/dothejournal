import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BrandMark } from '@/components/layout/brand-mark'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getViewer } from '@/lib/journal/queries'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  const viewer = await getViewer()
  if (viewer) redirect('/dashboard')

  const params = await searchParams
  const error =
    typeof params.error === 'string' ? params.error.slice(0, 240) : null

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent_70%)]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <ThemeToggle />
        </div>

        <Card className="border-border/80 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to review your trades, edge, and drawdowns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm error={error} />
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your journal is private. Every query runs through Row-Level Security.
        </p>
      </div>
    </main>
  )
}
