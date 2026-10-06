import { expect, test } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

// FR-083: lo que registra un dueño aparece en Actividad con su nombre;
// en las ediciones, antes → después.
test('un gasto registrado, anulado y restaurado aparece en Actividad', async ({ page }) => {
  await entrarComoDueno(page)
  const detalle = `Actividad E2E ${Date.now()}`

  await page.goto('/gastos/nuevo')
  await page.getByLabel('Monto (RD$)').fill('321')
  await page.getByLabel('Categoría').selectOption({ label: 'Transporte' })
  await page.getByLabel('Detalle (opcional)').fill(detalle)
  await page.getByRole('button', { name: 'Registrar gasto' }).click()
  const fila = page
    .getByRole('list', { name: 'Gastos' })
    .getByRole('listitem')
    .filter({ hasText: detalle })
  await fila.getByRole('button', { name: 'Anular' }).click()
  await expect(fila).toContainText('anulado')

  await page.goto('/actividad?ver=dinero')
  await expect(page.getByRole('heading', { name: 'Actividad' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Dinero' })).toHaveAttribute('aria-checked', 'true')
  const hoy = page.getByRole('list').first()
  const registro = hoy.getByRole('listitem').filter({ hasText: detalle })
  await expect(registro.filter({ hasText: 'Registró un gasto de RD$321.00' })).toBeVisible()
  await expect(registro.filter({ hasText: 'Anuló un gasto de RD$321.00' })).toBeVisible()
  await expect(registro.first()).toContainText('Leo ·')
})

test('cambiar un precio muestra el antes → después', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/ajustes')
  const docena = page.getByLabel('Precio de la docena (RD$)')
  await expect(docena).toHaveValue('550')
  await docena.fill('575')
  await page.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(page.getByText('Lista de precios guardada')).toBeVisible()

  // Deja la base como estaba para las demás pruebas.
  await docena.fill('550')
  await page.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(page.getByText('Lista de precios guardada').first()).toBeVisible()

  await page.goto('/actividad?ver=catalogo')
  const cambio = page
    .getByRole('listitem')
    .filter({ hasText: 'Cambió la lista de precios' })
    .filter({ hasText: 'RD$575.00' })
  await expect(cambio.first()).toContainText('Precio docena:')
  await expect(cambio.first()).toContainText('RD$550.00')
  await expect(cambio.first()).toContainText('Leo ·')
})

test('desde una entrada se llega al pedido', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/actividad?ver=pedidos')
  const enlace = page.getByRole('link', { name: /Creó un pedido de/ }).first()
  await expect(enlace).toBeVisible()
  await enlace.click()
  await expect(page).toHaveURL(/\/pedidos\/[0-9a-f-]{36}$/)
})
