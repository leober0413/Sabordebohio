import { expect, test } from '@playwright/test'

import { entrar, entrarComoDueno, INTRUSO } from './helpers.ts'

test('sin sesión, la app manda al login', async ({ page }) => {
  await page.goto('/ajustes')
  await expect(page).toHaveURL(/\/login$/)
})

test('credenciales incorrectas muestran un error en español', async ({ page }) => {
  await entrar(page, { email: 'leo@bohio.test', password: 'equivocada' })
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.')
})

test('el dueño entra y la sesión se mantiene al recargar (FR-080, FR-081)', async ({ page }) => {
  await entrarComoDueno(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('un usuario que no es dueño no ve nada (FR-080)', async ({ page }) => {
  await entrar(page, INTRUSO)
  await expect(page.getByRole('heading', { name: 'Esta cuenta no tiene acceso' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toHaveCount(0)
})
