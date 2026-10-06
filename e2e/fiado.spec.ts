import { expect, test } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

// docs/testing.md · E2E 2: cliente con dos pedidos fiados → abono → se aplica al más viejo primero.
// Seed: Pedro Gómez debe RD$200 (4 pollo, hace 6 días) y RD$275 (6 res, hace 2 días).
test('abono sin elegir pedido salda primero el más viejo (FR-043, DEC-003)', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/fiado')
  const fila = page
    .getByRole('list', { name: 'Clientes con fiado' })
    .getByRole('link')
    .filter({ hasText: 'Pedro Gómez' })
  await expect(fila).toContainText('RD$475.00')
  await expect(fila).toContainText('2 pedidos')
  await fila.click()

  await page.getByLabel('Monto (RD$)').fill('250')
  await page.getByRole('button', { name: 'Registrar abono' }).click()
  await expect(page.getByText('Abono de RD$250.00 registrado')).toBeVisible()

  // El viejo (RD$200) queda pagado y el nuevo debe RD$225.
  const viejo = page.getByRole('article').filter({ hasText: '4 Pollo' })
  const nuevo = page.getByRole('article').filter({ hasText: '6 Res' })
  await expect(viejo).toContainText('Pagado')
  await expect(nuevo).toContainText('debe RD$225.00')

  // Deshacer el abono devuelve los saldos (deja la base como estaba).
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(nuevo).not.toContainText('debe RD$225.00')
  await expect(viejo).toContainText('Por cobrar')
})

test('pedido "Pagado" al crear y cobro al entregar (FR-041)', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/pedidos/nuevo')
  await page.getByPlaceholder('Buscar por nombre o teléfono').fill('Ana')
  await page.getByRole('button', { name: /Ana Martínez/ }).click()
  await page.getByRole('button', { name: 'Agregar una de Queso' }).click()
  await page.getByRole('button', { name: 'Agregar una de Queso' }).click()
  await page.getByRole('radio', { name: 'Pagado' }).click()
  await page.getByRole('button', { name: 'Guardar pedido' }).click()

  // El más nuevo va último (sin hora, por orden de creación); las corridas de
  // celular y PC crean un pedido cada una.
  const tarjeta = page
    .getByRole('article')
    .filter({ hasText: '2 Queso' })
    .filter({ hasText: 'Ana Martínez' })
    .last()
  await expect(tarjeta).toContainText('Pagado')

  // Otro pedido por cobrar: se cobra al entregar desde el detalle.
  await page.goto('/pedidos/nuevo')
  await page.getByPlaceholder('Buscar por nombre o teléfono').fill('Ana')
  await page.getByRole('button', { name: /Ana Martínez/ }).click()
  await page.getByRole('button', { name: 'Agregar una de Res' }).click()
  await page.getByRole('button', { name: 'Guardar pedido' }).click()
  const porCobrar = page
    .getByRole('article')
    .filter({ hasText: '1 Res' })
    .filter({ hasText: 'Ana Martínez' })
    .last()
  await expect(porCobrar).toContainText('Por cobrar')
  await porCobrar.getByRole('link').click()

  await page.getByRole('radio', { name: 'Transferencia' }).click()
  await page.getByRole('button', { name: 'Entregar y cobrar RD$50.00' }).click()
  await expect(page.getByRole('list', { name: 'Pagos registrados' })).toContainText('Transferencia')
})
