import { expect, test } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

// docs/testing.md · E2E 3: conteo de queso bajo el mínimo → alerta en "Hoy" →
// compra → la alerta desaparece (FR-062, FR-063, FR-061).
test('conteo bajo el mínimo muestra la alerta y la compra la quita', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/inventario?tab=ingredientes')
  await page
    .getByRole('list', { name: 'Stock por ingrediente' })
    .getByRole('link')
    .filter({ hasText: /^Queso/ })
    .click()

  await page.getByRole('radio', { name: 'Contar' }).click()
  await page.getByLabel('¿Cuánto hay? (lb)').fill('1.5')
  await page.getByRole('button', { name: 'Registrar conteo' }).click()
  await expect(page.getByText(/Conteo registrado/)).toBeVisible()
  await expect(page.getByText('En o bajo el mínimo (2 lb)')).toBeVisible()

  await page.goto('/')
  const alerta = page.getByRole('link', { name: /Stock bajo:.*Queso \(1\.5 lb\)/ })
  await expect(alerta).toBeVisible()
  // Contador en el menú de Inventario (el de la barra inferior o el lateral, según el ancho).
  await expect(page.getByLabel(/alertas? de stock/).filter({ visible: true })).toBeVisible()

  // Comprar 5 lb a RD$750 (desde el botón + o el menú).
  await page.goto('/compras/nueva')
  await page.getByLabel('Ingrediente').selectOption({ label: 'Queso (lb)' })
  await page.getByLabel('Cantidad (lb)').fill('5')
  await page.getByLabel('Costo total (RD$)').fill('750')
  await page.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(page.getByText('Compra registrada · 5 por RD$750.00')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
  // El ingrediente Queso (en lb) ya no alerta; el sabor Queso puede alertar aparte.
  await expect(page.getByText(/Queso \([\d.]+ lb\)/)).toHaveCount(0)
})

test('ajuste de catibías por merma queda en el historial (FR-052)', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/inventario')
  const fila = page
    .getByRole('list', { name: 'Stock por sabor' })
    .getByRole('link')
    .filter({ hasText: 'Queso' })
  const antes = Number(await fila.locator('span.tabular').innerText())
  await fila.click()

  await page.getByRole('button', { name: 'Agregar una de Queso' }).click() // 2
  await page.getByRole('button', { name: 'Registrar ajuste' }).click()
  await expect(page.getByText('Ajuste de -2 registrado')).toBeVisible()
  const historial = page.getByRole('list', { name: 'Historial de movimientos' })
  await expect(historial.getByRole('listitem').first()).toContainText('Ajuste')
  await expect(historial.getByRole('listitem').first()).toContainText('merma')
  await expect(page.getByText(String(antes - 2), { exact: true })).toBeVisible()
})
