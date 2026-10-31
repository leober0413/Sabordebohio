import { expect, test } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

// FR-050: la tanda se puede contar por docenas con +12.
test('registrar una tanda por docenas suma al stock', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/inventario')
  const fila = page
    .getByRole('list', { name: 'Stock por sabor' })
    .getByRole('listitem')
    .filter({ hasText: 'Queso' })
  const antes = Number(await fila.locator('span.tabular').innerText())

  await page.goto('/tandas/nueva')
  const docena = page.getByRole('button', { name: 'Agregar una docena de Queso' })
  await docena.click()
  await docena.click()
  await page.getByRole('button', { name: 'Agregar una de Queso' }).click()
  await expect(page.getByText('2 docenas y 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Registrar 25 catibías (2 docenas y 1)' }).click()

  await expect(fila.locator('span.tabular')).toHaveText(String(antes + 25))
})
