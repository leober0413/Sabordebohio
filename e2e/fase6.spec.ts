import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { entrarComoDueno } from './helpers.ts'

// FR-073: exportar a CSV desde Finanzas.
test('exportar pedidos, pagos y gastos del mes a CSV', async ({ page }) => {
  await entrarComoDueno(page)
  await page.goto('/finanzas?periodo=mes')
  const tarjeta = page.getByRole('heading', { name: 'Exportar a CSV' }).locator('..').locator('..')

  const descargar = async (boton: string) => {
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      tarjeta.getByRole('button', { name: boton }).click(),
    ])
    const ruta = await descarga.path()
    return { nombre: descarga.suggestedFilename(), texto: await readFile(ruta, 'utf8') }
  }

  const pedidos = await descargar('Pedidos')
  expect(pedidos.nombre).toMatch(/^pedidos_\d{4}-\d{2}-01_a_\d{4}-\d{2}-\d{2}\.csv$/)
  expect(pedidos.texto.startsWith('﻿Fecha de entrega,Hora,Cliente,Teléfono,Catibías')).toBe(true)
  expect(pedidos.texto).toContain('Pedro Gómez')

  const pagos = await descargar('Pagos')
  expect(pagos.texto).toContain('Fecha,Cliente,Pedido (entrega),Monto,Método')

  const gastos = await descargar('Gastos')
  expect(gastos.texto).toContain('Ingredientes')
  expect(gastos.texto).toMatch(/Compra: 3 lb de Queso,450,Sí/)
})

// NFR-U-005: en pantallas anchas los pedidos van en tabla.
test('en PC los pedidos del día se ven en una tabla', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc', 'Solo aplica a pantallas anchas')
  await entrarComoDueno(page)
  await page.goto('/pedidos')
  const tabla = page.getByRole('table', { name: 'Pedidos del día' })
  await expect(tabla).toBeVisible()
  await expect(tabla.getByRole('columnheader', { name: 'Cliente' })).toBeVisible()
  await expect(tabla.getByRole('row').filter({ hasText: 'Juan Rodríguez' }).first()).toBeVisible()
})
