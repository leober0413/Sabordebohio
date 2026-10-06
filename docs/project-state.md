# Project State — "Sabor de Bohío"

**Última actualización:** 2026-10-06
**Etapa:** BUILD — Fases 0 a 2 en producción; Fase 3 (pagos y fiado) y Fase 4 (inventario y alertas) en PR paralelos.

## Readiness

**Estado: READY**, con dos validaciones que se hacen en la Fase 0 y no bloquean el arranque.

| Área | Estado | Documento |
|---|---|---|
| Producto y problema | Claro | `product-discovery.md` |
| MVP | Definido | `mvp.md` |
| Requisitos | VALIDATED | `requirements.md` |
| Stack | ADOPTED (DEC-001, DEC-002; hosting: Vercel) | `decision-log.md` |
| UI/UX | Principios + prototipo | `ui-ux.md` |
| Base de datos y RPC | Fase 1 implementada (perfiles, precios, catálogos, RLS); resto PROVISIONALLY SELECTED | `database.md` |
| Seguridad | Cubierta en el diseño de datos (RLS, RPC, sin registro público) | `database.md` |
| Pruebas | Definidas | `testing.md` |
| Entorno de desarrollo | VALIDATED (DEC-005) | `decision-log.md` |
| Plan | Fases 0–6 | `roadmap.md` |

## Validaciones de la Fase 0 (resueltas)

1. ✅ `supabase start` funciona dentro de la sesión de Claude Code en la nube (DEC-005 → VALIDATED). Requiere arrancar Docker y usar Docker Hub; lo hace `scripts/session-start.sh`.
2. ✅ Hosting del frontend: **Vercel**, por elección del dueño (cierra DEC-002). Verificar en la Fase 2 si el uso comercial obliga al plan Pro.

## Pendientes de negocio (no bloquean)

- Precio suelta: se configura en la app (FR-002).
- Regla de redondeo definitiva: se configura en la app (BR-012).
- Copias de seguridad del plan de Supabase: verificar al crear el proyecto de producción.

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Registrar pedidos resulta lento y vuelven a la memoria | Meta de < 30 s, prueba con cronómetro, uso real desde la Fase 2 |
| RLS o RPC mal escritas exponen o corrompen datos | Escritura solo por RPC, pruebas pgTAP obligatorias |
| Supabase local no arranca en la nube | Validado en la Fase 0. Riesgo residual: límite de descargas de Docker Hub sin caché (el script reintenta) |

## Próximo paso

1. Mergear los PR de las Fases 0, 1 y 2, en ese orden.
2. Seguir `docs/despliegue.md` (cuentas de Supabase y Vercel, secretos en GitHub, crear los dos dueños).
3. Empezar el uso real en paralelo con la memoria y medir el registro de pedidos (< 30 s, NFR-U-001).
4. Luego las Fases 3 (pagos y fiado) y 4 (inventario y alertas), que son independientes entre sí.

Recomendado en la configuración del entorno de la nube (DEC-005 regla 3): setup script con `npm ci` y `bash scripts/session-start.sh && npx supabase stop` para que las imágenes de Docker queden en caché.
