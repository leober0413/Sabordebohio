import { expect, test } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

// FR-013: un número escrito de otra forma no crea otro cliente; se ofrece el que ya existe.
test('un teléfono ya registrado ofrece el cliente existente en vez de duplicarlo', async ({
  page,
}) => {
  await entrarComoDueno(page)
  await page.goto('/pedidos/nuevo')

  // El seed tiene a María Pérez con 809-555-0101: se encuentra con los números pegados.
  await page.getByPlaceholder('Buscar por nombre o teléfono').fill('8095550101')
  await expect(
    page.getByRole('list', { name: 'Clientes encontrados' }).getByText('María Pérez'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  await page.getByLabel('Nombre').fill('María P.')
  await page.getByLabel('Teléfono (opcional)').fill('(809) 555 0101')
  await expect(page.getByText('Ese teléfono ya es de María Pérez')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear cliente' })).toBeDisabled()

  await page.getByRole('button', { name: 'Usar a María Pérez' }).click()
  await expect(page.getByText('María Pérez', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cambiar' })).toBeVisible()
})
