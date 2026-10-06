import { expect, test, type Page } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

async function stockDe(page: Page, sabor: string): Promise<number> {
  await page.goto('/inventario')
  const fila = page
    .getByRole('list', { name: 'Stock por sabor' })
    .getByRole('listitem')
    .filter({ hasText: sabor })
  const texto = await fila.locator('span.tabular').innerText()
  return Number(texto)
}

// docs/testing.md · E2E 1: crear pedido de 8 → total correcto → listo → entregar → el stock baja 8.
test('pedido de 8 catibías: total, listo, entregar y el stock baja 8', async ({ page }) => {
  await entrarComoDueno(page)
  const antes = await stockDe(page, 'Pollo')

  await page.goto('/pedidos/nuevo')
  const cliente = `Cliente E2E ${Date.now()}`
  // FR-010: crear el cliente sin salir del pedido.
  await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  await page.getByLabel('Nombre').fill(cliente)
  await page.getByRole('button', { name: 'Crear cliente' }).click()
  await expect(page.getByText(cliente, { exact: true })).toBeVisible()

  const mas = page.getByRole('button', { name: 'Agregar una de Pollo' })
  for (let i = 0; i < 8; i++) await mas.click()
  await expect(page.getByText('RD$367.00')).toBeVisible()
  await expect(page.getByText(/Precio de docena · 8 ×/)).toBeVisible()
  await page.getByRole('button', { name: 'Guardar pedido' }).click()

  // Vuelve a Hoy con el pedido.
  await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
  const tarjeta = page.getByRole('article').filter({ hasText: cliente })
  await expect(tarjeta).toContainText('8 Pollo')
  await expect(tarjeta).toContainText('RD$367.00')

  await tarjeta.getByRole('button', { name: /^Listo/ }).click()
  await expect(tarjeta.getByText('Listo', { exact: true })).toBeVisible()
  await tarjeta.getByRole('button', { name: /^Entregar/ }).click()
  // Entregado sale de "Hoy" (FR-030).
  await expect(tarjeta).toHaveCount(0)

  expect(await stockDe(page, 'Pollo')).toBe(antes - 8)
})

test('"Deshacer" una entrega devuelve el stock (BR-006)', async ({ page }) => {
  await entrarComoDueno(page)
  const antes = await stockDe(page, 'Res')

  await page.goto('/')
  // Pedido del seed: Juan Rodríguez, 12 de res, listo.
  const tarjeta = page.getByRole('article').filter({ hasText: '12 Res' }).first()
  await tarjeta.getByRole('button', { name: /^Entregar/ }).click()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText(/Se deshizo/)).toBeVisible()

  expect(await stockDe(page, 'Res')).toBe(antes)
})

test('pedidos de mañana en la lista por día (FR-033)', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/pedidos')
  await page.getByRole('button', { name: 'Día siguiente' }).click()
  await expect(page.getByText('Mañana', { exact: true })).toBeVisible()
  await expect(page.getByRole('article').filter({ hasText: 'María Pérez' })).toContainText(
    '12 Pollo · 12 Res',
  )
})
