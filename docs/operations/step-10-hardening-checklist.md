# Step 10 Hardening Checklist

## Implemented

- Auth placeholder gate via `x-api-key` in production mode.
- API version headers and unsupported-version rejection.
- Structured request logging with database persistence to `request_logs`.
- Centralized error handling.
- CI workflow covering DB verification, schema validation, env validation, type-check, lint, test, and build.
- ML export endpoint backed by `ml_training_export`.

## Operational notes

- Production must set `APP_API_KEY`.
- Production deployments should run `npm run db:fresh:dev` only in disposable environments; never in live environments.
- Backup scope: PostgreSQL database `AMFPI`, migration SQL, seed SQL, and environment templates.
- Restore path: provision PostgreSQL, restore dump, run migrations only for drifted environments, then validate with `npm run db:validate:schema:dev`.
