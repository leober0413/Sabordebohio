import { expect, test } from '@playwright/test'

test('la app carga con el manifiesto de la PWA', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sabor de Bohío' })).toBeVisible()

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifest = await (await page.request.get(manifestHref!)).json()
  expect(manifest.name).toBe('Sabor de Bohío')
  expect(manifest.display).toBe('standalone')
})
