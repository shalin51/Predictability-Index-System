import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import type { Request, Response, NextFunction } from 'express';
import { initializeConfig } from '../config/env';
import { apiVersion, requireApiVersion } from '../middlewares/api-version';
import { authPlaceholder } from '../middlewares/auth-placeholder';
import { errorHandler } from '../middlewares/error-handler';
import { requestLogger } from '../middlewares/request-logger';
import { createRequestShape, ResponseCapture } from './http-context';
import { routes, type RouteDefinition } from './routes';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

function normalizePath(pathname: string): string {
  const withoutPrefix = pathname.startsWith('/api') ? pathname.slice(4) || '/' : pathname;
  const normalized = withoutPrefix.replace(/\/+$/, '') || '/';
  return normalized === '/' ? normalized : normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function splitPath(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

function matchRoute(method: string, pathname: string): { route?: RouteDefinition; params: Record<string, string> } {
  const requestSegments = splitPath(pathname);

  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const routeSegments = splitPath(route.path);
    if (routeSegments.length !== requestSegments.length) {
      continue;
    }

    const params: Record<string, string> = {};
    let matched = true;

    for (let index = 0; index < routeSegments.length; index += 1) {
      const routeSegment = routeSegments[index] ?? '';
      const requestSegment = requestSegments[index] ?? '';

      if (routeSegment.startsWith(':')) {
        params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
        continue;
      }

      if (routeSegment !== requestSegment) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { route, params };
    }
  }

  return { params: {} };
}

async function readBody(request: HttpRequest): Promise<{ body: unknown; error?: HttpResponseInit }> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { body: undefined };
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  if (
    contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
    contentType.includes('application/octet-stream')
  ) {
    const bytes = Buffer.from(await request.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024) {
      return { body: undefined, error: { status: 413, jsonBody: { error: 'Workbook exceeds the 10 MB limit', code: 'PAYLOAD_TOO_LARGE' } } };
    }
    return { body: bytes };
  }

  const rawBody = await request.text();
  if (!rawBody) return { body: undefined };

  if (contentType.includes('application/json')) {
    try {
      return { body: JSON.parse(rawBody) };
    } catch {
      const response = new ResponseCapture(request.headers.get('access-control-request-headers'));
      response.status(400).json({
        error: 'Invalid JSON request body',
        code: 'INVALID_JSON',
        timestamp: new Date().toISOString(),
      });
      return {
        body: undefined,
        error: response.toHttpResponse(),
      };
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return { body: Object.fromEntries(new URLSearchParams(rawBody).entries()) };
  }

  return { body: rawBody };
}

function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
}

function buildPipelineHandler(route: RouteDefinition | undefined): (req: Request, res: Response) => void {
  return route?.handler ?? notFoundHandler;
}

async function executePipeline(req: Request, resCapture: ResponseCapture, handler: (req: Request, res: Response) => void): Promise<void> {
  const stack: Array<Middleware | ((req: Request, res: Response) => void)> = [
    requestLogger,
    apiVersion,
    requireApiVersion,
    authPlaceholder,
    handler,
  ];

  let index = -1;

  const run = (error?: unknown): void => {
    if (error) {
      errorHandler(error instanceof Error ? error : new Error(String(error)), req, resCapture as unknown as Response, () => undefined);
      return;
    }

    index += 1;
    const current = stack[index];

    if (!current) {
      if (!resCapture.finished) {
        resCapture.end();
      }
      return;
    }

    try {
      if (current.length >= 3) {
        (current as Middleware)(req, resCapture as unknown as Response, run);
        return;
      }

      (current as (req: Request, res: Response) => void)(req, resCapture as unknown as Response);
    } catch (caught) {
      errorHandler(caught instanceof Error ? caught : new Error(String(caught)), req, resCapture as unknown as Response, () => undefined);
    }
  };

  run();
  await resCapture.waitForFinish();
}

export async function handleApiRequest(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  await initializeConfig();

  if (request.method.toUpperCase() === 'OPTIONS') {
    return {
      status: 204,
      headers: new ResponseCapture(request.headers.get('access-control-request-headers')).headers,
    };
  }

  const url = new URL(request.url);
  const normalizedPath = normalizePath(url.pathname);
  if (request.method.toUpperCase() === 'POST' && normalizedPath === '/setup-sheet-imports/preview') {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') && !contentType.includes('application/octet-stream')) {
      return { status: 415, jsonBody: { error: 'Unsupported workbook content type', code: 'UNSUPPORTED_MEDIA_TYPE' } };
    }
  }
  const parsedBody = await readBody(request);
  if (parsedBody.error) {
    return parsedBody.error;
  }

  const match = matchRoute(request.method.toUpperCase(), normalizedPath);
  const req = createRequestShape({
    method: request.method.toUpperCase(),
    normalizedPath,
    search: url.search,
    headers: request.headers,
    params: match.params,
    body: parsedBody.body,
  });
  const resCapture = new ResponseCapture(request.headers.get('access-control-request-headers'));

  await executePipeline(req, resCapture, buildPipelineHandler(match.route));
  return resCapture.toHttpResponse();
}

app.http('main-server-api', {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '{*segments}',
  handler: handleApiRequest,
});
