import { expect, test } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

// "RD$1,234.00" → 1234; "-RD$175.00" → -175
const dinero = (texto: string) =>
  (texto.includes('-') ? -1 : 1) * Number(texto.replace(/[^\d.]/g, ''))

// FR-064, FR-070, BR-010: un gasto del día sube los gastos y baja la ganancia.
test('registrar un gasto se refleja en el resumen del día', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/finanzas?periodo=dia')
  const tarjeta = (titulo: string) =>
    page.locator('dl > div').filter({ hasText: titulo }).locator('dd').first()
  await expect(tarjeta('Gastos')).toBeVisible()
  const leer = async (titulo: string) => dinero(await tarjeta(titulo).innerText())
  const gastosAntes = await leer('Gastos')
  const gananciaAntes = await leer('Ganancia aprox.')

  await page.goto('/gastos/nuevo')
  await page.getByLabel('Monto (RD$)').fill('1200')
  await page.getByLabel('Categoría').selectOption({ label: 'Gas' })
  await page.getByLabel('Detalle (opcional)').fill('Tanque E2E')
  await page.getByRole('button', { name: 'Registrar gasto' }).click()
  await expect(
    page.getByRole('list', { name: 'Gastos' }).getByText('Tanque E2E').first(),
  ).toBeVisible()

  await page.goto('/finanzas?periodo=dia')
  await expect.poll(() => leer('Gastos')).toBe(gastosAntes + 1200)
  await expect.poll(() => leer('Ganancia aprox.')).toBe(gananciaAntes - 1200)
  await expect(page.getByRole('list', { name: 'Gastos por categoría' })).toContainText('Gas')
})

test('anular un gasto y deshacer', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/gastos/nuevo')
  const detalle = `Empaque E2E ${Date.now()}`
  await page.getByLabel('Monto (RD$)').fill('80')
  await page.getByLabel('Categoría').selectOption({ label: 'Empaques' })
  await page.getByLabel('Detalle (opcional)').fill(detalle)
  await page.getByRole('button', { name: 'Registrar gasto' }).click()

  const fila = page
    .getByRole('list', { name: 'Gastos' })
    .getByRole('listitem')
    .filter({ hasText: detalle })
  await fila.getByRole('button', { name: 'Anular' }).click()
  await expect(fila).toContainText('anulado')
  await page
    .locator('[data-sonner-toast]')
    .filter({ hasText: 'anulado' })
    .getByRole('button', { name: 'Deshacer' })
    .click()
  await expect(fila.getByRole('button', { name: 'Anular' })).toBeVisible()
})
