import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Esta página no existe</h1>
      <Button asChild>
        <Link to="/">Volver a Hoy</Link>
      </Button>
    </section>
  )
}
