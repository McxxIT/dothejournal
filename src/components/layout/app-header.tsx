import { LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { BrandMark } from '@/components/layout/brand-mark'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function AppHeader({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <BrandMark />
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Journal
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {email ? (
            <span className="hidden max-w-[220px] truncate text-xs text-muted-foreground md:block">
              {email}
            </span>
          ) : null}
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
