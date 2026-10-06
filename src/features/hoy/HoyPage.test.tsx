import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HoyPage } from '@/features/hoy/HoyPage'

describe('HoyPage', () => {
  it('muestra el estado vacío con instrucciones', () => {
    render(<HoyPage />)
    expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
    expect(screen.getByText('Aún no hay pedidos hoy')).toBeInTheDocument()
  })
})
