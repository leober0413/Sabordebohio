# Product Discovery — Sistema de Gestión de Ventas "Sabor de Bohío"

> Secuencia de razonamiento: Problema → Usuario → Necesidad → Valor → Solución → Funcionalidades → Tecnología.

**Última actualización:** 2026-10-05
**Etapa del proyecto:** DISCOVERY → MVP

## Status

PROVISIONALLY SELECTED — el problema, los usuarios y el valor están claros; quedan preguntas abiertas de volumen que no cambian la dirección del producto.

## 1. Problema

**Sabor de Bohío**, un negocio familiar de catibías (pollo, res y queso), recibe pedidos de boca en boca y por WhatsApp y **no registra nada: todo se lleva de memoria**. Esto provoca tres problemas concretos (Known, declarados por el dueño):

1. **Pedidos que se olvidan** o se confunden.
2. **Inventario sin control**, tanto de catibías ya hechas como de ingredientes.
3. **Finanzas sin visibilidad**: no se sabe con certeza cuánto se vende, cuánto se cobra, cuánto se debe (fiado) ni cuánto se gana.

## 2. Usuarios objetivo

- **Usuario primario:** los dos dueños del negocio (Leo y su pareja). Ambos toman pedidos, producen y cobran.
- **Usuarios secundarios:** ninguno en el MVP. Los clientes finales **no** usan el sistema; siguen pidiendo por WhatsApp o en persona.

## 3. Necesidad

- Anotar un pedido en segundos desde el celular, justo cuando llega por WhatsApp.
- Ver de un vistazo qué hay que hacer y entregar hoy.
- Saber cuántas catibías hay hechas y qué ingredientes faltan.
- Saber quién debe y cuánto.
- Conocer ventas, gastos y ganancia aproximada por período.

## 4. Valor

- **Para el negocio:** dejar de perder ventas por olvidos, dejar de perder dinero por fiados no cobrados y saber si el negocio realmente es rentable.
- **Para los dueños:** menos carga mental; la información deja de depender de que alguien "se acuerde".

## 5. Concepto de solución

Una aplicación móvil sencilla, compartida por los dos dueños, centrada en **el pedido**. Registrar un pedido alimenta automáticamente el stock de catibías y las finanzas. Ingredientes y fiado se gestionan en la misma app.

## 6. Objetivos

- Que ningún pedido registrado se olvide.
- Que el stock de catibías refleje la realidad sin conteos manuales diarios.
- Que el fiado pendiente sea visible y cobrable.
- Que al final de cada semana/mes se pueda ver ventas, gastos y ganancia aproximada.

## 7. No-objetivos

- No es una tienda en línea ni un canal de pedidos para clientes.
- No reemplaza WhatsApp como canal de comunicación con clientes.
- No emite facturas fiscales (NCF) ni lleva contabilidad formal.
- No está pensado (por ahora) para venderse a otros negocios.

## 8. Funcionalidades clave (conceptuales)

- Gestión de pedidos con estados y vista del día.
- Stock de catibías (producción por tandas y descuento al entregar).
- Inventario de ingredientes (compras y ajustes manuales).
- Control de fiado y abonos.
- Resumen financiero por período.
- Catálogo de productos con **precios editables**.

## 9. Restricciones

| Restricción | Tipo | Fuente |
|---|---|---|
| Uso principalmente desde el celular | Producto | Known |
| Dos usuarios, mismo negocio | Producto | Known |
| Desarrollador único (Leo) | Equipo | Known |
| Precios cambian con el tiempo; deben ser editables | Negocio | Known |
| Formas de pago: efectivo, transferencia, fiado | Negocio | Known |
| Entrega depende del cliente (recoge o delivery) | Negocio | Known |
| Presupuesto de operación bajo/cero | Costo | Assumption |

## 10. Supuestos

| ID | Supuesto | Riesgo si es falso |
|---|---|---|
| A-01 | El volumen es bajo (decenas, no miles, de pedidos por semana). | Bajo: el diseño propuesto aguanta varios órdenes de magnitud más. |
| A-02 | Ambos dueños tienen smartphone con internet la mayor parte del tiempo. | Medio: si la conexión es mala, se necesitaría modo offline. |
| A-03 | Un pedido puede mezclar catibías de distintos sabores (pollo, res, queso). | Bajo. |
| A-04 | Producen tanto por encargo como por tandas; ambas pasan por el mismo stock. | Medio: afecta cómo se descuenta el stock. |
| A-05 | El costo de envío, cuando aplica, se cobra al cliente y se registra en el pedido. | Bajo. |

## 11. Preguntas abiertas

- **Volumen semanal:** indefinido actualmente. No bloquea; se medirá con el propio sistema.
- **Receta por catibía** (gramos de harina, carne, aceite): desconocida. Bloquea solo el descuento automático de ingredientes (diferido).
- **¿Hay más productos además de pollo, res y queso?** (tamaños, combos, bebidas). El catálogo editable lo cubre, pero conviene confirmarlo.
- **Conectividad:** ¿se necesita usar la app sin internet?

## Next Step

Proceder con `mvp.md` (redactado) y luego `requirements.md`.
