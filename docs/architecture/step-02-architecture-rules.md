# Step 02 Architecture Rules

## Core boundaries

- `main-server/src/modules`: route orchestration and use-case services only.
- `main-server/src/infrastructure`: database and repository implementations only.
- `main-server/src/core`: reusable server-side base abstractions only.
- `main-server/src/interfaces`: reserved for explicit transport adapters as the app grows.
- `main-server/src/config`, `middlewares`, `errors`: cross-cutting concerns only.
- `dashboard/src/features`: screen-level feature modules.
- `dashboard/src/components`: reusable UI primitives.
- `dashboard/src/services`: HTTP client adapters only.
- `dashboard/src/types`: re-exports from `@amfpi/shared`; no local API DTO ownership.
- `packages/shared/src/contracts`: request and response DTOs shared across apps.
- `packages/shared/src/types`: domain model types shared across apps.
- `packages/shared/src/constants`: cross-app constants only.
- `packages/shared/src/validators`: reserved for shared schema validators as contracts expand.

## Rules

- Controllers and route modules must not contain business logic.
- Dashboard code must consume API DTOs from `@amfpi/shared`.
- Shared contracts are the single source of truth for cross-app request and response shapes.
- Repository implementations must stay behind service/module boundaries.
- New feature work must update the relevant step file in `docs/steps/`.
