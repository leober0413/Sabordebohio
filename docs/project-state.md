# Project State — "Sabor de Bohío"

**Última actualización:** 2026-10-06
**Etapa:** BUILD terminado — Fases 0 a 6 con código completo. Siguiente: **uso real** y revisión de los criterios de éxito de `mvp.md` tras 2 semanas.

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

1. Mergear los PR pendientes (Fases 5 y 6) y cargar el secreto `BACKUP_PASSPHRASE` (ver `despliegue.md`).
2. Usar la app en paralelo con la memoria durante **2 semanas** y medir el registro de pedidos (< 30 s, NFR-U-001).
3. **Revisión de criterios de éxito** de `mvp.md` con los dueños (Fase 6, tarea manual): qué se usa, qué estorba, si el reparto de abonos (DEC-003) y DEC-006 funcionan en la práctica, y qué sigue de "Después del MVP" en el roadmap.
