# Sabor de Bohío

App de ventas e inventario para Sabor de Bohío (catibías por WhatsApp). PWA en React + Vite con Supabase.

- Documentación del proyecto: [`docs/`](docs/) — empieza por [`docs/project-state.md`](docs/project-state.md) y [`docs/roadmap.md`](docs/roadmap.md).
- Reglas para Claude Code y comandos: [`CLAUDE.md`](CLAUDE.md).

## Desarrollo local

Requiere Node 22 y Docker.

```bash
npm ci
scripts/session-start.sh   # Supabase local + migraciones + .env.local
npm run dev
```
