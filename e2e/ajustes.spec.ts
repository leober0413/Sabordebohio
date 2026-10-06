import { expect, test } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/ajustes')
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
})

test('cambiar el precio de la docena actualiza la vista previa y se guarda (FR-002)', async ({
  page,
}) => {
  const docena = page.getByLabel('Precio de la docena (RD$)')
  await expect(docena).toHaveValue('550')

  await docena.fill('600')
  const vista = page.getByRole('region', { name: 'Así quedan los precios' })
  await expect(vista.getByText('RD$400.00')).toBeVisible() // 8 × 600/12

  await page.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(page.getByText('Lista de precios guardada')).toBeVisible()
  await page.reload()
  await expect(docena).toHaveValue('600')

  // Deja la base como estaba para las demás pruebas.
  await docena.fill('550')
  await page.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(page.getByText('Lista de precios guardada').first()).toBeVisible()
})

test('validación en español al escribir un precio inválido', async ({ page }) => {
  await page.getByLabel('Precio de la docena (RD$)').fill('abc')
  await page.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(
    page.getByText('Escribe el precio de docena en pesos, por ejemplo 550 o 45.50.'),
  ).toBeVisible()
})

test('crear, desactivar y deshacer un sabor (FR-001, FR-003)', async ({ page }) => {
  const nombre = `Prueba ${Date.now()}`
  await page.getByLabel('Nuevo sabor').fill(nombre)
  await page.getByRole('button', { name: 'Agregar' }).click()

  const fila = page
    .getByRole('list', { name: 'Lista de sabores' })
    .getByRole('listitem')
    .filter({ hasText: nombre })
  await expect(fila).toBeVisible()

  await fila.getByRole('button', { name: 'Desactivar' }).click()
  await expect(fila.getByText('Desactivado')).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(fila.getByRole('button', { name: 'Desactivar' })).toBeVisible()

  // Limpieza: los sabores no se borran (BR-011), se dejan desactivados.
  await fila.getByRole('button', { name: 'Desactivar' }).click()
  await expect(fila.getByText('Desactivado')).toBeVisible()
})
