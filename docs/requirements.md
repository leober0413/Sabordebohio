# Requirements — Sistema de Gestión de Ventas "Sabor de Bohío"

> Flujo: Visión → Necesidades → Capacidades → Requisitos → Criterios de aceptación → Arquitectura.

**Última actualización:** 2026-10-05

## Status

VALIDATED — revisados con los dueños; preguntas abiertas resueltas. Listos para arquitectura.

## Trazabilidad

Implementan el alcance de `mvp.md` (funcionalidades 1–10), que a su vez responde a los tres dolores de `product-discovery.md`:
- **D1** Pedidos olvidados · **D2** Inventario sin control · **D3** Finanzas sin visibilidad.

## Actores

| Actor | Descripción |
|---|---|
| **Dueño** | Cualquiera de los dos dueños. Ambos tienen exactamente los mismos permisos en el MVP. |

No hay sistemas externos ni procesos automáticos en el MVP.

## Reglas de negocio

| ID | Regla |
|---|---|
| BR-001 | Un pedido guarda los **precios vigentes al momento de crearse** (precio suelta y precio de docena aplicados). Cambiar la lista de precios no altera pedidos existentes. |
| BR-002 | Total del pedido = subtotal de catibías según BR-012 + costo de envío (0 si el cliente recoge). |
| BR-012 | **Precio por cantidad.** Todos los sabores cuestan igual y se cuentan juntos (se pueden mezclar). Sea *N* el total de catibías del pedido: si *N* < 6, subtotal = *N* × precio suelta; si *N* ≥ 6, subtotal = *N* × (precio docena ÷ 12), redondeado según la **regla de redondeo configurada** (por defecto, al peso más cercano; opciones: 1, 5 o 10 pesos). Ejemplo con docena = RD$550: 6 → 275, 8 → 367, 12 → 550, 18 → 825. El mínimo (6), el precio suelta y el precio de docena son configurables. |
| BR-003 | Estado de pago derivado: **Pagado** si abonado ≥ total; **Parcial** si 0 < abonado < total; **Pendiente** si abonado = 0. |
| BR-004 | **Fiado** = pedido entregado con saldo pendiente > 0. El saldo de un cliente es la suma de saldos de sus pedidos no cancelados. |
| BR-005 | El stock de catibías **aumenta** al registrar una tanda y **disminuye** al marcar un pedido como *entregado*. No se descuenta al crear el pedido. |
| BR-006 | Si un pedido entregado se revierte o se cancela, su descuento de stock se reintegra. |
| BR-007 | Toda variación de stock (de catibías o ingredientes) queda registrada como un **movimiento** con tipo, cantidad, fecha, usuario y motivo. El stock actual es la suma de movimientos. Nunca se edita el número directamente. |
| BR-008 | El stock puede quedar negativo (se vendió algo que no se registró como producido); el sistema lo permite pero lo muestra como alerta. |
| BR-009 | Una compra de ingrediente cuenta como **gasto** en la fecha de la compra. |
| BR-010 | Ganancia aproximada del período = ventas de pedidos entregados en el período − gastos del período. Es aproximada porque no considera consumo real de ingredientes. |
| BR-011 | Los registros con historial (productos, ingredientes, clientes) no se borran, se **desactivan**, para no romper pedidos y reportes pasados. |

## Requisitos funcionales

### Productos (catálogo)

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-001 | El dueño puede crear un producto (sabor) con nombre. | MVP-1 | Al crear "Catibía de queso", aparece en la lista y es seleccionable en nuevos pedidos. | Must |
| FR-002 | El dueño puede editar la **lista de precios**: precio suelta, precio de docena cantidad mínima para precio de docena (por defecto 6) y regla de redondeo (1, 5 o 10 pesos; por defecto 1). | MVP-1, BR-001, BR-012 | Dado un pedido existente con docena a RD$550, cuando la docena cambia a RD$600, el pedido viejo sigue en RD$550 y uno nuevo usa RD$600. | Must |
| FR-004 | Al armar un pedido, la app muestra qué precio se aplicó ("precio suelta" o "precio de docena") y cuánto se ahorra el cliente frente al precio suelta. | BR-012, NFR-U-001 | Con 8 catibías se ve "Precio de docena · 8 × RD$45.83". | Should |
| FR-003 | El dueño puede desactivar un producto. | BR-011 | Un producto desactivado no aparece al crear pedidos pero sigue visible en pedidos y reportes pasados. | Should |

### Clientes

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-010 | Al crear un pedido, el dueño puede elegir un cliente existente o crear uno nuevo con nombre y teléfono (teléfono opcional). | MVP-2 | Crear un cliente desde el formulario del pedido no obliga a salir de ese formulario. | Must |
| FR-011 | El sistema sugiere clientes existentes al escribir nombre o teléfono. | MVP-2 | Al teclear "Mar", aparecen los clientes cuyo nombre o teléfono contiene "Mar". | Should |
| FR-012 | El dueño puede ver el historial de pedidos y el saldo de un cliente. | MVP-7 | La ficha del cliente muestra sus pedidos y el saldo total pendiente según BR-004. | Should |

### Pedidos (D1)

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-020 | El dueño puede crear un pedido con cliente, una o más líneas (producto + cantidad), fecha y hora de entrega, tipo de entrega (*recoge* / *delivery*), costo de envío opcional y notas. | MVP-2, D1 | Se guarda un pedido con 4 de pollo y 2 de queso para mañana a las 4 pm, delivery RD$100; el total es RD$275 + RD$100 (BR-002, BR-012). | Must |
| FR-021 | La fecha de entrega por defecto es **hoy** y la hora es opcional. | D1, NFR-U-001 | Un pedido creado sin tocar la fecha queda para hoy. | Must |
| FR-022 | Un pedido tiene estado: *pendiente → listo → entregado*, o *cancelado*. El dueño lo cambia con un toque. | MVP-2 | Desde la lista, un toque pasa un pedido de *pendiente* a *listo*. | Must |
| FR-023 | Al marcar *entregado*, el stock de cada producto se descuenta (BR-005). | MVP-5, D2 | Con stock de pollo = 10, al entregar un pedido de 3, el stock queda en 7. | Must |
| FR-024 | El dueño puede editar un pedido no entregado (líneas, fecha, entrega, notas). | MVP-2 | Cambiar cantidades recalcula el total. | Must |
| FR-025 | El dueño puede revertir un pedido entregado a *listo* o cancelarlo; el stock se reintegra (BR-006). | BR-006 | Al revertir el pedido de 3, el stock vuelve de 7 a 10. | Should |
| FR-026 | Atajo **"Hecho al momento"** al entregar: registra la producción de esas cantidades y la entrega en un solo paso (stock neto sin cambio). | A-04 | Con stock de queso = 0, entregar 5 "hechas al momento" deja el stock en 0, sin alerta de negativo, y quedan registrados ambos movimientos. | Should |

### Pantalla "Hoy" (D1)

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-030 | La pantalla inicial muestra los pedidos *pendientes* y *listos* con entrega hoy, ordenados por hora (los sin hora al final). | MVP-3, D1 | Abrir la app muestra solo los pedidos de hoy no entregados ni cancelados. | Must |
| FR-031 | "Hoy" también muestra los pedidos **atrasados** (fecha pasada y no entregados), destacados. | D1 | Un pedido de ayer pendiente aparece arriba, marcado como atrasado. | Must |
| FR-032 | "Hoy" muestra el total de catibías a preparar por producto para los pedidos pendientes del día. | D1, D2 | Con pedidos de 3 + 4 de pollo, muestra "Pollo: 7". | Should |
| FR-033 | El dueño puede ver pedidos de otros días (próximos y pasados) y filtrarlos por estado. | MVP-2 | Se puede ver la lista de mañana. | Must |

### Pagos y fiado (D3)

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-040 | El dueño puede registrar uno o más pagos para un pedido, cada uno con monto, método (*efectivo* / *transferencia*) y fecha. | MVP-4 | Un pedido de RD$300 con pago de RD$100 queda *Parcial* (BR-003). | Must |
| FR-041 | Al crear o entregar un pedido, el dueño puede marcarlo como "pagado completo" con un toque, eligiendo el método. | MVP-4, NFR-U-001 | Un toque registra un pago por el total. | Must |
| FR-042 | El sistema muestra la lista de clientes con fiado (BR-004), con saldo y antigüedad del pedido más viejo. | MVP-7 | La lista muestra cliente, saldo total y "hace N días". | Must |
| FR-043 | Desde la lista de fiado, el dueño puede registrar un abono a un cliente. Por defecto se aplica a sus pedidos pendientes **del más viejo al más nuevo**; opcionalmente el dueño puede elegir a qué pedido aplicarlo. | MVP-7, DEC-003 | Con pedidos pendientes de RD$200 (viejo) y RD$300, un abono de RD$250 sin elegir pedido salda el primero y deja RD$250 en el segundo. Si elige el segundo, ese queda en RD$50 y el primero intacto. | Should |

### Stock de catibías (D2)

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-050 | El dueño puede registrar una tanda: cantidades producidas por producto y fecha. | MVP-5 | Registrar +30 pollo y +20 queso suma esas cantidades al stock. | Must |
| FR-051 | El sistema muestra el stock actual por producto. | MVP-5 | El stock es la suma de movimientos (BR-007). | Must |
| FR-052 | El dueño puede hacer un ajuste manual con motivo (*merma*, *conteo*, *consumo propio*, *otro*). | MVP-5 | Un ajuste de −2 "merma" queda en el historial con usuario y fecha. | Must |
| FR-053 | El sistema destaca productos con stock negativo (BR-008). | BR-008 | Un stock de −3 aparece en rojo. | Should |
| FR-054 | El dueño puede definir un stock mínimo opcional por producto (catibías hechas); si el stock baja de ese mínimo aparece la misma alerta que para ingredientes (FR-063). | Pedido de los dueños | Con mínimo de pollo = 10 y stock = 8, aparece alerta. | Should |

### Ingredientes (D2, D3)

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-060 | El dueño puede crear ingredientes con nombre, unidad (lb, kg, unidad, litro, etc.) y stock mínimo opcional. | MVP-6 | Se crea "Queso" en libras con mínimo 2. | Must |
| FR-061 | El dueño puede registrar una compra: ingrediente, cantidad, costo total y fecha. Suma al stock y se registra como gasto (BR-009). | MVP-6 | Comprar 5 lb de queso a RD$750 sube el stock en 5 y agrega RD$750 a gastos del día. | Must |
| FR-062 | El dueño puede registrar un conteo o ajuste manual del stock de un ingrediente. | MVP-6 | Contar "quedan 1.5 lb" genera el movimiento necesario para que el stock sea 1.5. | Must |
| FR-063 | **Alerta de stock bajo dentro de la app:** cuando un ingrediente está en o por debajo de su mínimo, aparece un aviso visible en "Hoy" y un indicador (contador) en el menú de Inventario, con la lista de lo que se está acabando. La alerta desaparece sola cuando el stock vuelve a superar el mínimo. | MVP-6, pedido explícito de los dueños | Con queso = 1.5 y mínimo 2, aparece el aviso en "Hoy" y el contador muestra 1. Al registrar una compra de 5 lb, el aviso desaparece. Un ingrediente sin mínimo nunca genera alerta. | Must |
| FR-065 | El dueño puede **crear, cambiar o quitar el mínimo** de cualquier ingrediente o producto en cualquier momento desde la app. | Pedido explícito de los dueños | Cambiar el mínimo del queso de 2 a 3 lb con stock = 2.5 hace aparecer la alerta de inmediato. | Must |
| FR-064 | El dueño puede registrar **otros gastos** no ligados a ingredientes (gas, empaques, transporte), con monto, categoría y fecha. Las categorías son editables. | D3 (confirmado por los dueños) | Un gasto de gas de RD$1,200 aparece en el resumen financiero. | Must |

### Finanzas (D3)

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-070 | El sistema muestra un resumen por **día, semana y mes** con: vendido (pedidos entregados), cobrado (pagos recibidos), por cobrar (fiado), gastos y ganancia aproximada (BR-010). | MVP-8 | Los números del resumen coinciden con la suma manual de los registros del período. | Must |
| FR-071 | El resumen muestra unidades vendidas por producto en el período. | MVP-8 | Muestra "Pollo: 120, Res: 80, Queso: 45" para la semana. | Should |
| FR-072 | El resumen separa lo cobrado por método (efectivo / transferencia). | MVP-8 | Permite cuadrar el efectivo en mano. | Should |
| FR-073 | El dueño puede exportar pedidos, pagos y gastos a CSV. | NFR-R-002 | Se descarga un archivo abrible en Excel/Sheets. | Could |

### Acceso

| ID | Requisito | Traza | Criterio de aceptación | Prioridad |
|---|---|---|---|---|
| FR-080 | Cada dueño entra con su propia cuenta. No existe registro público. | MVP-9 | Una persona sin cuenta no puede ver ningún dato. | Must |
| FR-081 | La sesión se mantiene abierta en el celular hasta que el dueño cierre sesión. | NFR-U-001 | No se pide login cada vez que se abre la app. | Must |
| FR-082 | Cada movimiento, pedido y pago guarda qué dueño lo registró. | BR-007 | El historial muestra "registrado por Leo". | Should |
| FR-083 | El dueño puede ver la **actividad**: quién registró, editó o anuló algo y cuándo, con el antes → después en las ediciones. Cubre pedidos (crear, editar, cambios de estado), pagos, abonos, gastos, compras, tandas, ajustes y conteos de stock, clientes, sabores, ingredientes, categorías y la lista de precios. | FR-082 (pedido del dueño, 2026-10-06; DEC-007) | Si Leo cambia un pedido de 6 a 8 de pollo, en Actividad sale "Editó el pedido de Ana · Pollo: 6 → 8 · Leo · 3:45 p. m.". Nadie puede editar ni borrar la actividad. | Should |

## Requisitos no funcionales

### Usabilidad (la categoría más importante del proyecto)

| ID | Requisito | Justificación |
|---|---|---|
| NFR-U-001 | Un pedido típico (cliente existente, 1–2 productos, para hoy, pagado) se registra en **menos de 30 segundos** y con pocos toques. | Si registrar es lento, volverán a la memoria y el MVP fracasa (criterio de éxito de `mvp.md`). |
| NFR-U-002 | Diseño mobile-first: usable con una mano en pantallas de ~360 px de ancho; botones grandes. | Uso principal desde el celular (Known). |
| NFR-U-003 | Instalable en la pantalla de inicio del celular (PWA). | Que se sienta como app y se abra rápido. |
| NFR-U-004 | Interfaz en español, montos en pesos dominicanos (RD$). | Usuarios y mercado. |
| NFR-U-005 | **La misma app se usa desde la PC** en un navegador (Chrome, Edge, Firefox). En pantallas anchas el diseño se adapta: menú lateral, tablas y resúmenes aprovechan el espacio. Mismos datos y misma cuenta que en el celular. | Pedido explícito de los dueños. Una sola base de código para celular y PC (DEC-002). |

### Rendimiento

| ID | Requisito | Justificación |
|---|---|---|
| NFR-P-001 | La pantalla "Hoy" carga en menos de 2 s en una conexión móvil 4G normal. | Se abre muchas veces al día, a menudo con un cliente esperando. |

### Escalabilidad

| ID | Requisito | Justificación |
|---|---|---|
| NFR-S-001 | Soportar 2 usuarios concurrentes y hasta ~500 pedidos/semana sin cambios de diseño. | Volumen real desconocido (A-01); este margen cubre con holgura un negocio familiar. No se diseña para más. |

### Fiabilidad e integridad

| ID | Requisito | Justificación |
|---|---|---|
| NFR-R-001 | Crear pedido + líneas, entregar pedido + movimientos de stock y registrar pago se guardan de forma **atómica** (todo o nada). | Un stock o un saldo a medias destruye la confianza en la app. |
| NFR-R-002 | Copia de seguridad automática de la base de datos al menos diaria, con posibilidad de restaurar. | Los datos de ventas y fiado son el activo del negocio. |
| NFR-R-003 | Si dos dueños editan el mismo pedido a la vez, el sistema no pierde datos en silencio (detecta el conflicto o aplica el último cambio de forma visible). | Dos usuarios activos en paralelo. |

### Disponibilidad

| ID | Requisito | Justificación |
|---|---|---|
| NFR-A-001 | Disponibilidad "best effort" del proveedor de hosting; no se requiere SLA. | Un corte corto no detiene el negocio (pueden anotar en WhatsApp y registrar luego). Pagar alta disponibilidad no se justifica. |

### Seguridad

| ID | Requisito | Justificación |
|---|---|---|
| NFR-SEC-001 | Todo el tráfico por HTTPS; contraseñas gestionadas por un proveedor de autenticación o con hash fuerte, nunca en texto plano. | Datos de clientes (nombres, teléfonos) y finanzas del negocio. |
| NFR-SEC-002 | Toda lectura y escritura de datos exige usuario autenticado y autorizado (verificado en el servidor o con reglas de acceso en la base de datos). | Evitar acceso de terceros a los datos. |

### Mantenibilidad

| ID | Requisito | Justificación |
|---|---|---|
| NFR-M-001 | Mantenible por un solo desarrollador a tiempo parcial; preferir tecnologías que el desarrollador ya domina y pocas piezas móviles. | Equipo de una persona (Known). |

### Costo

| ID | Requisito | Justificación |
|---|---|---|
| NFR-C-001 | Costo de operación cercano a **RD$0/mes** en el volumen esperado (planes gratuitos o mínimos). | Negocio pequeño; el sistema no debe costar más de lo que ahorra. |

## Restricciones

- Un único desarrollador (Leo).
- Uso principal desde smartphone.
- Presupuesto de operación mínimo.

## Fuera del alcance

Ver tabla "Fuera del alcance" en `mvp.md`: descuento automático por receta, integración con WhatsApp, tienda en línea, NCF, roles distintos, multi-negocio, modo offline completo, reportes avanzados.

## Supuestos

| ID | Supuesto | Estado |
|---|---|---|
| A-01 | Volumen bajo (decenas de pedidos por semana). | Abierto; NFR-S-001 da margen. |
| A-02 | Buena conectividad la mayor parte del tiempo. | **Confirmado** por los dueños (2026-10-05). El modo offline sigue fuera del alcance. |
| A-04 | Producción por tandas y por encargo conviven. | **Resuelto por diseño:** el stock se descuenta al entregar (BR-005) y el atajo "Hecho al momento" (FR-026) cubre lo que se fabrica para un pedido específico. Funciona para ambos casos. |
| A-06 | El fiado se lleva por pedido, no como una cuenta corriente aparte. | Abierto; validar con uso real. |

## Preguntas abiertas

1. ~~¿Orden de aplicación de abonos?~~ Los dueños no tienen preferencia. Resuelto provisionalmente en DEC-003: más viejo primero por defecto, con opción de elegir pedido.
2. ~~¿Otros gastos?~~ Sí (gas, empaques). FR-064 pasa a *Must*.
3. ~~¿Uso sin internet?~~ No es necesario (A-02 confirmado).

4. **Precio suelta:** pendiente de definir por los dueños; se configura desde la app (FR-002).
5. **Redondeo con precio de docena:** DEFERRED por los dueños; se configura desde la app (FR-002). Valor inicial: al peso más cercano.

Ninguna de estas bloquea la arquitectura.

## Confianza

**Media-alta.** Los requisitos *Must* se derivan directamente de dolores declarados. Las reglas de fiado (A-06, FR-043) y el atajo "Hecho al momento" son propuestas razonables que conviene validar con los dueños antes de diseñar la base de datos.
