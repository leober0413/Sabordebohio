# MVP Definition — Sistema de Gestión de Ventas "Sabor de Bohío"

> El objetivo no es maximizar funcionalidades, sino la versión más pequeña que resuelva los tres dolores declarados en `product-discovery.md`.

**Última actualización:** 2026-10-05

## Status

PROVISIONALLY SELECTED — alcance acordado en conversación; falta validarlo con uso real.

## Hipótesis central

Si los dueños registran cada pedido en la app en el momento en que llega, dejarán de olvidar pedidos y obtendrán, sin trabajo extra, el control de stock y finanzas que hoy no tienen.

## Objetivo del MVP

**Que cada pedido quede registrado y nada se olvide**, y que ese registro alimente automáticamente stock y finanzas.

## Dentro del alcance

| # | Funcionalidad | Por qué es esencial |
|---|---|---|
| 1 | **Sabores y lista de precios editable** (pollo, res, queso). Precio suelta para menos de 6; desde 6, precio de docena proporcional, mezclando sabores (BR-012). Los precios se copian al pedido, así cambiarlos no altera ventas pasadas. | Precios cambian (Known); las finanzas deben ser correctas en el tiempo. |
| 2 | **Pedidos**: cliente (nombre y teléfono), productos y cantidades, fecha y hora de entrega, tipo de entrega (recoge / delivery) con costo de envío opcional, notas, estado *pendiente → listo → entregado* (o *cancelado*). | Dolor #1: pedidos olvidados. |
| 3 | **Pantalla "Hoy"**: pedidos pendientes y listos del día, ordenados por hora de entrega. | Es lo que evita el olvido en la práctica. |
| 4 | **Pagos**: efectivo, transferencia o fiado; un pedido puede quedar pagado, parcial o pendiente. | Formas de pago reales (Known). |
| 5 | **Stock de catibías**: registrar tandas producidas (+N por producto); al marcar un pedido como entregado se descuenta. Ajuste manual con motivo (merma, conteo). | Dolor #2 (catibías). |
| 6 | **Ingredientes**: lista editable; registrar compras (cantidad + costo) que suman stock y cuentan como gasto; ajuste manual de conteo; mínimo con aviso. | Dolor #2 (ingredientes) y #3 (gastos). |
| 7 | **Fiado**: lista de clientes con saldo pendiente, registro de abonos. | Dolor #3; dinero que hoy se pierde. |
| 8 | **Resumen financiero** por día / semana / mes: vendido, cobrado, por cobrar, gastos, ganancia aproximada. | Dolor #3. |
| 9 | **Acceso para dos usuarios** con login; ambos ven y editan todo. | Uso compartido (Known) y datos protegidos. |
| 10 | **Mobile-first**, instalable en el celular. | Restricción de uso (Known). |

## Fuera del alcance (Deferred)

| Funcionalidad | Razón | Revisar cuando |
|---|---|---|
| Descuento automático de ingredientes por receta | Requiere receta medida con precisión; una receta mal medida hace que el stock mienta y se pierda confianza en la app. | Tras 3–4 semanas de compras y conteos reales que permitan estimar el consumo por catibía. |
| Recepción automática de pedidos desde WhatsApp | Complejidad y costo (API de WhatsApp Business) desproporcionados para el volumen actual. | Si registrar pedidos a mano se vuelve el cuello de botella. |
| Catálogo / tienda en línea para clientes | No resuelve ninguno de los tres dolores declarados. | Si se busca crecer canales de venta. |
| Facturación con NCF / contabilidad formal | No es una necesidad declarada. | Si el negocio se formaliza fiscalmente. |
| Roles y permisos distintos | Solo dos dueños con acceso total. | Si entra un empleado. |
| Multi-negocio / reventa a terceros | Fuera del objetivo actual. | Si se decide convertirlo en producto. |
| Modo offline completo | Se asume buena conectividad (A-02). | Si la conexión falla al tomar pedidos. |
| Reportes avanzados y gráficos | El resumen básico cubre la necesidad inicial. | Cuando haya meses de datos que analizar. |

## Criterios de éxito

- Durante 2 semanas, **todos** los pedidos se registran en la app (cero pedidos fuera del sistema).
- **Cero pedidos olvidados** en ese período.
- El stock de catibías en la app coincide con el conteo físico al final del día (tolerancia mínima).
- Se puede responder en menos de 1 minuto: "¿cuánto ganamos esta semana?" y "¿quién nos debe?".

## Enfoque de validación

1. Usarlo en paralelo con la memoria durante la primera semana.
2. Al final de cada día, comparar stock de la app con conteo físico.
3. Al final de la semana 2, revisar: ¿hubo pedidos sin registrar? ¿qué pantalla se usó menos? ¿qué estorbó?
4. Ajustar el alcance antes de añadir funcionalidades nuevas.

## Nota sobre el stack mínimo

El MVP necesita: una app web mobile-first instalable (PWA), un backend sencillo con autenticación y una base de datos relacional (los datos son claramente relacionales: pedidos → líneas → productos, pagos, clientes). Sin microservicios, sin infraestructura compleja, con costo de hosting cercano a cero. La decisión formal va en `stack-decision.md`.

## Trigger para reconsiderar

- Si tras 2 semanas los pedidos se siguen anotando fuera de la app → el registro es demasiado lento; simplificar el formulario antes de añadir nada.
- Si el volumen crece mucho o entra un empleado → revisar roles, offline y automatización de WhatsApp.

## Supuestos

Ver tabla de supuestos en `product-discovery.md` (A-01 a A-05).

## Confianza

**Media-alta.** Los dolores, usuarios y restricciones están declarados explícitamente. La incertidumbre principal es el volumen real y cómo conviven producción por tandas y por encargo en el stock (A-04).
