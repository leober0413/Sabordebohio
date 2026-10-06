# UI/UX — "Sabor de Bohío"

**Última actualización:** 2026-10-06
**Status:** PROVISIONALLY SELECTED — principios y estructura de pantallas; se validan con un prototipo antes de construir.

> Meta: que registrar un pedido sea más rápido que acordarse de él (NFR-U-001: < 30 s).

## 1. Principios

1. **Velocidad sobre todo.** Las acciones frecuentes (nuevo pedido, marcar entregado, cobrar) están a un toque. Valores por defecto inteligentes: fecha = hoy, cantidad +1, pago = efectivo.
2. **Una mano en el celular.** Navegación y botones principales en la mitad inferior de la pantalla, al alcance del pulgar. Áreas táctiles de al menos 44 × 44 px.
3. **Números, no texto.** Cantidades con botones **− / +** grandes en vez de teclear. Montos con teclado numérico.
4. **Lo urgente arriba.** Pedidos atrasados y alertas de stock bajo aparecen primero, con color, sin que haya que buscarlos.
5. **Feedback inmediato.** Cada acción responde al instante (actualización optimista) y confirma con un aviso breve; errores claros en español, sin jerga.
6. **Deshacer en vez de preguntar.** Acciones reversibles (marcar entregado, registrar pago) muestran "Deshacer" durante unos segundos en lugar de un diálogo "¿Está seguro?". Solo lo destructivo pide confirmación.
7. **Estados vacíos útiles.** Una lista vacía explica qué hacer ("Aún no hay pedidos hoy — toca + para crear uno").
8. **Responsive real (NFR-U-005).** Celular: barra de navegación inferior. PC: menú lateral, tablas y resumen en columnas.
9. **Accesible.** Contraste suficiente, tamaños de texto legibles, no depender solo del color (la alerta lleva icono y texto).
10. **Modo claro y oscuro**, siguiendo la configuración del dispositivo.

## 2. Identidad visual (propuesta)

- **Concepto:** "bohío" — cálido, artesanal, casero. Tonos tierra (madera, palma, fritura dorada) sobre fondos claros y limpios, sin caer en lo rústico recargado.
- **Paleta base:** un primario cálido (ámbar/terracota) para acciones principales; neutros cálidos para fondos; verde para éxito/pagado, ámbar para alerta de stock, rojo para atrasado/negativo.
- **Tipografía:** una sans-serif legible y redondeada para la interfaz; números tabulares en montos y cantidades para que se alineen.
- **Logo/nombre:** "Sabor de Bohío" en la barra superior; ícono de la PWA con la inicial o un motivo de bohío.

## 3. Herramientas de UI

| Elemento | Elección | Por qué |
|---|---|---|
| Componentes | **shadcn/ui** (Radix UI + Tailwind) | Componentes accesibles que viven como código en el repo (Claude Code los lee y adapta), sin pelear con una librería cerrada. |
| Estilos | Tailwind CSS | Mobile-first y theming con variables (claro/oscuro). |
| Íconos | Lucide | Consistentes, ligeros. |
| Avisos | Sonner (toasts) | Confirmaciones breves y "Deshacer". |
| Paneles móviles | Drawer (vaul) en celular / Dialog en PC | Formularios que suben desde abajo en el celular. |
| Gráficos (resumen) | Recharts, uso mínimo | Solo donde un número no basta. |

## 4. Mapa de pantallas

### Navegación

| Celular (barra inferior) | PC (menú lateral) |
|---|---|
| Hoy · Pedidos · **[+]** · Inventario · Más | Hoy · Pedidos · Clientes / Fiado · Inventario · Gastos · Finanzas · Ajustes |

"Más" agrupa en el celular: Clientes / Fiado, Gastos, Finanzas, Ajustes (productos, precios, categorías, mínimos, cuenta).

El botón **[+]** central abre un menú rápido: *Nuevo pedido* (principal) · *Registrar tanda* · *Registrar compra* · *Registrar gasto*.

### Pantallas clave

**Hoy** (inicio)
- Franja de alertas: atrasados (rojo) y stock bajo (ámbar), cada una toca para ver detalle.
- "A preparar hoy": Pollo 7 · Res 4 · Queso 3 (FR-032).
- Lista de pedidos del día por hora: cliente, productos, total, estado de pago. Botón de acción según estado (*Listo* → *Entregar*). Deslizar para cobrar.

**Nuevo pedido** (drawer en celular)
1. Cliente: buscador con sugerencias; "Nuevo cliente" en línea.
2. Productos: una fila por sabor con **− cantidad +**; total en vivo.
3. Entrega: *Hoy* preseleccionado, hora opcional, *Recoge / Delivery* (+ costo de envío).
4. Pago: *Pagado (efectivo / transferencia)* · *Fiado* · *Parcial*.
5. Botón grande "Guardar pedido" fijo abajo.

**Entregar pedido**: confirma, permite cobrar en el mismo paso y ofrece "Hecho al momento" (FR-026).

**Inventario**: pestañas *Catibías* / *Ingredientes*. Cada fila: nombre, stock, mínimo, barra o indicador de nivel. Las que están bajo mínimo van arriba. Tocar → historial de movimientos, ajustar, editar mínimo (FR-065).

**Fiado**: clientes con saldo, ordenados por antigüedad; "Registrar abono".

**Finanzas**: selector Día / Semana / Mes; tarjetas: Vendido · Cobrado · Por cobrar · Gastos · Ganancia aprox.; desglose por producto y por método de pago.

## 5. Validación antes de construir

- Prototipo navegable de **Hoy** y **Nuevo pedido** para probar en el celular de los dueños.
- Prueba: registrar 5 pedidos reales de WhatsApp cronometrando; objetivo < 30 s cada uno.
- Ajustar el flujo antes de escribir el backend definitivo.
