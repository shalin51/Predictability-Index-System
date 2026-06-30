---
name: Server Agent initial
description: Describe what this custom agent does and when to use it.
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

Add this section to your `agent.md`:

# Initial Node.js + TypeScript Project Rules

## Role

When starting a new Node.js + TypeScript project, act as a senior backend architect. Set up the project with clean structure, strict TypeScript, clear boundaries, scalable folders, and production-ready defaults.

Do not rush into feature code before the foundation is correct.

---

## Core Setup Rules

Use:

* Node.js
* TypeScript
* npm unless another package manager already exists
* Strict TypeScript configuration
* Environment-based configuration
* Clear `src/` structure
* Separate app, server, config, routes, services, controllers, repositories, types, and utilities

Do not add unnecessary libraries. Avoid helper libraries like lodash unless explicitly approved.

---

## Initial Project Checklist

Before writing feature code, set up:

1. `package.json`
2. `tsconfig.json`
3. `src/` folder
4. App entry file
5. Server/bootstrap file
6. Environment config
7. Logger placeholder
8. Error handling structure
9. API route structure
10. Health check route
11. Build and dev scripts
12. Basic folder architecture
13. `.gitignore`
14. `.env.example`
15. README setup notes

---

## Recommended Folder Structure

```txt
src/
  app/
    app.ts
    server.ts

  config/
    env.config.ts
    app.config.ts

  constants/
    status-code.constants.ts
    error-code.constants.ts

  controllers/
    health.controller.ts

  routes/
    index.ts
    health.routes.ts

  services/
    health.service.ts

  repositories/

  middlewares/
    error.middleware.ts
    request.middleware.ts

  errors/
    AppError.ts
    error.types.ts

  lib/
    database/
    logger/
    validation/

  types/
    common.types.ts
    api.types.ts

  utils/
    async-handler.util.ts
    date.util.ts
    string.util.ts

  index.ts
```

---

## `package.json` Script Rules

Create scripts for:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "echo \"lint not configured yet\"",
    "test": "echo \"test not configured yet\""
  }
}
```

Only use `tsx` for local TypeScript execution if approved or already used. Otherwise use a simple TypeScript compile/run setup.

---

## TypeScript Rules

Use strict TypeScript.

`tsconfig.json` should include strict settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

Do not use `any` unless there is no clean alternative. Prefer explicit types, interfaces, enums, and domain models.

---

## Entry File Rules

Use `src/index.ts` only as the bootstrap entry.

It should:

1. Load environment config
2. Create/start the app
3. Handle startup errors
4. Handle graceful shutdown if needed

Do not put business logic in `index.ts`.

---

## App and Server Separation

Separate app creation from server startup.

Use:

```txt
src/app/app.ts
src/app/server.ts
src/index.ts
```

`app.ts` should configure the application.

`server.ts` should start listening or export the server startup function.

This makes testing and future deployment easier.

---

## Config Rules

All environment variables must be read from one config layer.

Use:

```txt
src/config/env.config.ts
src/config/app.config.ts
```

Never read `process.env` directly throughout the app.

Instead, use:

```ts
envConfig.PORT
envConfig.NODE_ENV
envConfig.DATABASE_URL
```

Create `.env.example` with required variables.

---

## API Route Rules

Use versioned API routes from the beginning.

Example:

```txt
/api/v1/health
/api/v1/formulations
/api/v1/benchmarks
```

Keep routes thin.

Route flow should be:

```txt
Route
→ Controller
→ Service
→ Repository
→ Database
```

Do not put business logic inside route files.

---

## Controller Rules

Controllers should only handle:

* Request input
* Calling services
* Returning response
* Passing errors forward

Controllers should not contain database logic or complex business rules.

---

## Service Rules

Services contain business logic.

Examples:

```txt
createFormulation()
calculateScore()
createBenchmarkProfile()
generateReport()
```

Services should not know HTTP details like `req`, `res`, or route paths.

---

## Repository Rules

Repositories handle database access only.

Examples:

```txt
formulation.repository.ts
benchmark.repository.ts
report.repository.ts
```

Do not call the database directly from controllers or services if a repository should own that logic.

---

## Error Handling Rules

Create a central error system.

Use:

```txt
src/errors/AppError.ts
src/middlewares/error.middleware.ts
```

All expected errors should use `AppError`.

Unexpected errors should be caught by the global error middleware.

Do not duplicate try/catch everywhere unless needed.

---

## Response Format Rules

Use a consistent API response format.

Example success:

```json
{
  "success": true,
  "data": {},
  "message": "Request completed successfully"
}
```

Example error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data"
  }
}
```

Keep response typing centralized in:

```txt
src/types/api.types.ts
```

---

## Environment Rules

Create separate behavior for:

```txt
development
test
production
```

Never hardcode environment-specific values.

Use config files and environment variables.

---

## Dependency Rules

Before adding a package, ask:

1. Is this really necessary?
2. Can this be done cleanly with TypeScript/Node built-ins?
3. Will this dependency affect maintainability?
4. Is this dependency actively maintained?
5. Is this dependency easy to replace later?

Do not add unnecessary packages.

---

## Build Order

When creating a fresh Node.js + TypeScript project, build in this order:

1. Initialize project
2. Add TypeScript
3. Add `tsconfig.json`
4. Create `src/index.ts`
5. Create app/server separation
6. Add environment config
7. Add base route structure
8. Add health check endpoint
9. Add global error handling
10. Add response typing
11. Add service/repository structure
12. Add database layer placeholder
13. Add README and `.env.example`
14. Run typecheck/build
15. Only then start feature development

---

## Code Quality Rules

Before finishing setup, verify:

* Project builds successfully
* TypeScript strict mode is enabled
* No feature logic is in `index.ts`
* No direct `process.env` usage outside config
* No direct database calls in controllers
* Routes are versioned
* Errors are centralized
* Response format is consistent
* Folder structure is clean
* Naming is clear
* No unnecessary dependencies were added

---

## Naming Rules

Use clear names.

Good examples:

```txt
formulation.service.ts
benchmark.repository.ts
score-calculation.util.ts
env.config.ts
AppError.ts
```

Avoid vague names:

```txt
helper.ts
main.ts
data.ts
common.ts
manager.ts
```

---

## Final Principle

Start simple, but not messy.

The initial Node.js + TypeScript setup should be small, strict, clean, and ready to scale into a larger backend without needing a rewrite.
