import { expect, test } from '@playwright/test'

import { DUENO, entrar, entrarComoDueno, INTRUSO } from './helpers.ts'

test('sin sesión, la app manda al login', async ({ page }) => {
  await page.goto('/ajustes')
  await expect(page).toHaveURL(/\/login$/)
})

test('credenciales incorrectas muestran un error en español', async ({ page }) => {
  await entrar(page, { email: 'leo@bohio.test', password: 'equivocada' })
  await expect(page.getByRole('alert')).toHaveText(
    'Correo o contraseña incorrectos. Revisa mayúsculas y signos de la contraseña.',
  )
})

test('el dueño entra y la sesión se mantiene al recargar (FR-080, FR-081)', async ({ page }) => {
  await entrarComoDueno(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()

  await page.goto('/ajustes')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('el correo con espacios o mayúsculas entra igual; la contraseña se puede ver', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Correo').fill('  Leo@Bohio.test ')
  const clave = page.getByLabel('Contraseña', { exact: true })
  await clave.fill(DUENO.password)
  await expect(clave).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click()
  await expect(clave).toHaveAttribute('type', 'text')
  await expect(page.getByRole('button', { name: 'Ocultar contraseña' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
})

test('un usuario que no es dueño no ve nada (FR-080)', async ({ page }) => {
  await entrar(page, INTRUSO)
  await expect(page.getByRole('heading', { name: 'Esta cuenta no tiene acceso' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toHaveCount(0)
})

test('el dueño cambia su contraseña y entra con la nueva', async ({ page }) => {
  const cambiar = async (nueva: string) => {
    await page.goto('/ajustes')
    await page.getByLabel('Contraseña nueva').fill(nueva)
    await page.getByLabel('Repítela').fill(nueva)
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(page.getByText('Contraseña cambiada')).toBeVisible()
  }

  await entrarComoDueno(page)
  await cambiar('nueva-clave-456')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await entrar(page, { email: DUENO.email, password: 'nueva-clave-456' })
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()

  // Deja la contraseña del seed para las demás pruebas.
  await cambiar(DUENO.password)
})
