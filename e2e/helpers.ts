import { expect, type Page } from '@playwright/test'

// Cuentas del seed (supabase/seed.sql). Solo existen en local y en CI.
export const DUENO = { email: 'leo@bohio.test', password: 'bohio-local-123' }
export const INTRUSO = { email: 'intruso@bohio.test', password: 'bohio-local-123' }

export async function entrar(page: Page, cuenta: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(cuenta.email)
  await page.getByLabel('Contraseña').fill(cuenta.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

export async function entrarComoDueno(page: Page) {
  await entrar(page, DUENO)
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
}
