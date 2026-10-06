import { readFileSync } from 'node:fs'

import { expect, test, type APIRequestContext } from '@playwright/test'

import { entrar, entrarComoDueno } from './helpers.ts'

// Ana nace con contraseña temporal (supabase/seed.sql), como las cuentas de crear-dueno.yml.
const ANA = { email: 'ana@bohio.test', password: 'bohio-local-123' }
const NUEVA = 'clave-de-ana-789'

/** Supabase local (lo escribe scripts/write-env.sh, también en CI). */
function supabaseLocal() {
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  )
  return { url: env.VITE_SUPABASE_URL, apikey: env.VITE_SUPABASE_ANON_KEY }
}

/** Deja a Ana como en el seed (contraseña y marca) para las demás corridas. */
async function restaurarAna(request: APIRequestContext) {
  const { url, apikey } = supabaseLocal()
  for (const password of [NUEVA, ANA.password]) {
    const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
      headers: { apikey },
      data: { email: ANA.email, password },
    })
    if (!login.ok()) continue
    const { access_token } = (await login.json()) as { access_token: string }
    const cambio = await request.put(`${url}/auth/v1/user`, {
      headers: { apikey, Authorization: `Bearer ${access_token}` },
      data: {
        ...(password === ANA.password ? {} : { password: ANA.password }),
        data: { clave_temporal: true },
      },
    })
    expect(cambio.ok()).toBeTruthy()
    return
  }
  throw new Error('No se pudo restaurar la cuenta de Ana.')
}

test.afterEach(async ({ request }) => {
  await restaurarAna(request)
})

test('la dueña nueva cambia la contraseña temporal paso a paso', async ({ page }) => {
  await entrar(page, ANA)
  await expect(page.getByRole('heading', { name: 'Hola, Ana' })).toBeVisible()
  await expect(page.getByText('Paso 1 de 3')).toBeVisible()
  await page.getByRole('button', { name: 'Cambiar mi contraseña' }).click()

  await expect(page.getByRole('heading', { name: 'Elige tu contraseña nueva' })).toBeFocused()
  await page.getByLabel('Contraseña nueva').fill(NUEVA)
  await page.getByLabel('Repítela').fill('otra-cosa-000')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
  await page.getByLabel('Repítela').fill(NUEVA)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()

  await expect(page.getByRole('heading', { name: '¡Listo!' })).toBeVisible()
  await expect(page.getByText('Paso 3 de 3')).toBeVisible()
  await expect(page.getByText(ANA.email)).toBeVisible()
  await page.getByRole('button', { name: 'Empezar a usar la app' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()

  // Ya no vuelve: ni al recargar ni al entrar otra vez con la contraseña nueva.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
  await page.goto('/ajustes')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await entrar(page, { email: ANA.email, password: NUEVA })
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hola, Ana' })).toHaveCount(0)
})

test('"Ahora no" deja usar la app y la guía vuelve al abrirla otra vez', async ({ page }) => {
  await entrar(page, ANA)
  await page.getByRole('button', { name: 'Ahora no' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()

  // Otra pestaña es como abrir la app de nuevo: la sesión sigue y la guía vuelve.
  const otra = await page.context().newPage()
  await otra.goto('/')
  await expect(otra.getByRole('heading', { name: 'Hola, Ana' })).toBeVisible()
})

test('los dueños que ya cambiaron su contraseña no ven la guía', async ({ page }) => {
  await entrarComoDueno(page)
  await expect(page.getByText('Paso 1 de 3')).toHaveCount(0)
})
