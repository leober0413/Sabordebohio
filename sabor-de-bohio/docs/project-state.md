# Project State — "Sabor de Bohío"

**Última actualización:** 2026-10-06
**Etapa:** READINESS REVIEW completada → **BUILD (Fase 0)**

## Readiness

**Estado: READY**, con dos validaciones que se hacen en la Fase 0 y no bloquean el arranque.

| Área | Estado | Documento |
|---|---|---|
| Producto y problema | Claro | `product-discovery.md` |
| MVP | Definido | `mvp.md` |
| Requisitos | VALIDATED | `requirements.md` |
| Stack | ADOPTED (DEC-001, DEC-002) | `decision-log.md` |
| UI/UX | Principios + prototipo | `ui-ux.md` |
| Base de datos y RPC | PROVISIONALLY SELECTED | `database.md` |
| Seguridad | Cubierta en el diseño de datos (RLS, RPC, sin registro público) | `database.md` |
| Pruebas | Definidas | `testing.md` |
| Entorno de desarrollo | PROVISIONALLY SELECTED (DEC-005) | `decision-log.md` |
| Plan | Fases 0–6 | `roadmap.md` |

## Validaciones pendientes (Fase 0)

1. `supabase start` funciona dentro de la sesión de Claude Code en la nube (DEC-005).
2. Hosting del frontend: Cloudflare Pages o Vercel (cierra DEC-002).

## Pendientes de negocio (no bloquean)

- Precio suelta: se configura en la app (FR-002).
- Regla de redondeo definitiva: se configura en la app (BR-012).
- Copias de seguridad del plan de Supabase: verificar al crear el proyecto de producción.

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Registrar pedidos resulta lento y vuelven a la memoria | Meta de < 30 s, prueba con cronómetro, uso real desde la Fase 2 |
| RLS o RPC mal escritas exponen o corrompen datos | Escritura solo por RPC, pruebas pgTAP obligatorias |
| Supabase local no arranca en la nube | Plan B documentado en DEC-005 |

## Próximo paso

Crear el repo en GitHub con esta carpeta, conectarlo a Claude Code y abrir una sesión **Cloud** con la tarea de la Fase 0.
