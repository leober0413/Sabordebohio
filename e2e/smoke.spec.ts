import { expect, test } from '@playwright/test'

test('la pantalla Hoy carga con el tema y el manifiesto de la PWA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
  await expect(page.getByText('Aún no hay pedidos hoy')).toBeVisible()

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifest = await (await page.request.get(manifestHref!)).json()
  expect(manifest.name).toBe('Sabor de Bohío')
  expect(manifest.display).toBe('standalone')
})
