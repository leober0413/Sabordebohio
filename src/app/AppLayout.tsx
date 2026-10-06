import {
  CalendarCheck,
  ClipboardList,
  Ellipsis,
  Factory,
  House,
  Package,
  Plus,
  Settings,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { cn } from '@/lib/utils'

// docs/ui-ux.md §4: celular con barra inferior, PC con menú lateral.
const LATERAL = [
  { to: '/', label: 'Hoy', Icono: House, end: true },
  { to: '/pedidos', label: 'Pedidos', Icono: CalendarCheck },
  { to: '/inventario', label: 'Inventario', Icono: Package },
  { to: '/ajustes', label: 'Ajustes', Icono: Settings },
]

const ACCIONES_RAPIDAS = [
  { to: '/pedidos/nuevo', label: 'Nuevo pedido', Icono: ClipboardList, principal: true },
  { to: '/tandas/nueva', label: 'Registrar tanda', Icono: Factory, principal: false },
]

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { pathname } = useLocation()

  // Al navegar se cierra el menú rápido. Se ajusta durante el render para no
  // encadenar efectos (patrón recomendado por React).
  const [rutaAnterior, setRutaAnterior] = useState(pathname)
  if (rutaAnterior !== pathname) {
    setRutaAnterior(pathname)
    setMenuAbierto(false)
  }

  useEffect(() => {
    if (!menuAbierto) return
    const cerrar = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAbierto(false)
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [menuAbierto])

  // En formularios con barra de guardar fija no se muestra la barra inferior.
  const conBarraPropia = /^\/(pedidos\/(nuevo|[^/]+\/editar))$/.test(pathname)

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r bg-card p-3 md:flex">
        <Link to="/" className="mb-4 flex items-center gap-2 rounded-md px-2 py-2">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="font-display text-lg font-semibold">Sabor de Bohío</span>
        </Link>
        <Link
          to="/pedidos/nuevo"
          className="mb-3 flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-5" aria-hidden />
          Nuevo pedido
        </Link>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {LATERAL.map(({ to, label, Icono, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              <Icono className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/tandas/nueva"
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-md px-3 font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <Factory className="size-5" aria-hidden />
            Registrar tanda
          </NavLink>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <Link to="/" className="flex items-center gap-2 rounded-md">
              <img src="/favicon.svg" alt="" className="size-8" />
              <span className="font-display text-lg font-semibold">Sabor de Bohío</span>
            </Link>
          </div>
        </header>
        <main
          className={cn(
            'mx-auto w-full max-w-5xl flex-1 px-4 pt-4 md:px-8 md:pt-8 md:pb-8',
            conBarraPropia ? 'pb-4' : 'pb-[calc(env(safe-area-inset-bottom)+5.5rem)]',
          )}
        >
          <Outlet />
        </main>
      </div>

      {!conBarraPropia && (
        <nav
          aria-label="Principal"
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="grid h-16 grid-cols-5 items-center">
            <ItemInferior to="/" label="Hoy" Icono={House} end />
            <ItemInferior to="/pedidos" label="Pedidos" Icono={CalendarCheck} />
            <li className="flex justify-center">
              <button
                type="button"
                aria-label={menuAbierto ? 'Cerrar menú rápido' : 'Abrir menú rápido'}
                aria-expanded={menuAbierto}
                aria-controls="menu-rapido"
                onClick={() => setMenuAbierto((v) => !v)}
                className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {menuAbierto ? (
                  <X className="size-7" aria-hidden />
                ) : (
                  <Plus className="size-7" aria-hidden />
                )}
              </button>
            </li>
            <ItemInferior to="/inventario" label="Inventario" Icono={Package} />
            <ItemInferior to="/mas" label="Más" Icono={Ellipsis} activoTambien={['/ajustes']} />
          </ul>
        </nav>
      )}

      {menuAbierto && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            aria-hidden
            onClick={() => setMenuAbierto(false)}
          />
          <div
            id="menu-rapido"
            role="menu"
            aria-label="Acciones rápidas"
            className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-xl md:hidden"
          >
            {ACCIONES_RAPIDAS.map(({ to, label, Icono, principal }) => (
              <Link
                key={to}
                to={to}
                role="menuitem"
                className={cn(
                  'flex min-h-14 items-center gap-3 rounded-xl px-4 text-base font-medium',
                  principal
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                <Icono className="size-5" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ItemInferior({
  to,
  label,
  Icono,
  end,
  activoTambien = [],
}: {
  to: string
  label: string
  Icono: typeof House
  end?: boolean
  activoTambien?: string[]
}) {
  const { pathname } = useLocation()
  return (
    <li className="flex justify-center">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-medium text-muted-foreground',
            (isActive || activoTambien.some((r) => pathname.startsWith(r))) && 'text-primary',
          )
        }
      >
        <Icono className="size-6" aria-hidden />
        {label}
      </NavLink>
    </li>
  )
}
