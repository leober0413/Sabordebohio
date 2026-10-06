import { Settings } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'

import { cn } from '@/lib/utils'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2 rounded-md">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="font-display text-lg font-semibold">Sabor de Bohío</span>
          </Link>
          {/* La navegación completa (barra inferior y menú lateral) llega en la Fase 2. */}
          <NavLink
            to="/ajustes"
            aria-label="Ajustes"
            className={({ isActive }) =>
              cn(
                'ml-auto flex size-11 items-center justify-center rounded-md hover:bg-accent',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <Settings className="size-5" aria-hidden />
          </NavLink>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Outlet />
      </main>
    </div>
  )
}
