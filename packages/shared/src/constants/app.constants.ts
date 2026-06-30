export const APP_VERSION = '1.0.0';

export const SERVICE_NAMES = {
  MAIN_SERVER: 'main-server',
  DASHBOARD: 'dashboard',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const APP_ENV = {
  DEV: 'dev',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;
