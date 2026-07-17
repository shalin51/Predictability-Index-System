import type { Request, Response } from 'express';
import { config } from '../config/env';

export interface RequestShapeOptions {
  method: string;
  normalizedPath: string;
  search: string;
  headers: Headers;
  params: Record<string, string>;
  body: unknown;
}

function buildHeaders(headers: Headers): Record<string, string> {
  const values: Record<string, string> = {};
  headers.forEach((value, key) => {
    values[key.toLowerCase()] = value;
  });
  return values;
}

function buildQuery(searchParams: URLSearchParams): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    const current = query[key];
    if (current === undefined) {
      query[key] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      query[key] = [current, value];
    }
  }

  return query;
}

function buildIpAddress(headers: Record<string, string>): string {
  const forwardedFor = headers['x-forwarded-for'];
  if (!forwardedFor) {
    return '';
  }

  return forwardedFor.split(',')[0]?.trim() ?? '';
}

export function createRequestShape(options: RequestShapeOptions): Request {
  const headerValues = buildHeaders(options.headers);
  const query = buildQuery(new URLSearchParams(options.search));
  const originalUrl = `${options.normalizedPath}${options.search}`;

  return {
    method: options.method,
    path: options.normalizedPath,
    originalUrl,
    headers: headerValues,
    params: options.params,
    query,
    body: options.body,
    ip: buildIpAddress(headerValues),
  } as unknown as Request;
}

function buildCorsHeaders(requestedHeaders: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': requestedHeaders ?? 'Content-Type, x-api-key, x-api-version, x-user-id, x-file-name',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS',
    'Access-Control-Allow-Origin': config.corsOrigin,
    Vary: 'Origin',
  };
}

export class ResponseCapture {
  private readonly finishListeners: Array<() => void> = [];
  private readonly finishedPromise: Promise<void>;
  private resolveFinished!: () => void;

  statusCode = 200;
  finished = false;
  body: unknown;
  headers: Record<string, string>;

  constructor(requestedHeaders: string | null) {
    this.headers = buildCorsHeaders(requestedHeaders);
    this.finishedPromise = new Promise<void>((resolve) => {
      this.resolveFinished = resolve;
    });
  }

  status(code: number): Response {
    this.statusCode = code;
    return this as unknown as Response;
  }

  json(payload: unknown): Response {
    this.body = payload;
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    this.finish();
    return this as unknown as Response;
  }

  end(payload?: unknown): Response {
    this.body = payload;
    this.finish();
    return this as unknown as Response;
  }

  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  on(event: string, listener: () => void): Response {
    if (event === 'finish') {
      this.finishListeners.push(listener);
    }
    return this as unknown as Response;
  }

  waitForFinish(): Promise<void> {
    return this.finishedPromise;
  }

  finish(): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    for (const listener of this.finishListeners) {
      listener();
    }
    this.resolveFinished();
  }

  toHttpResponse(): { status: number; headers: Record<string, string>; body?: string; jsonBody?: unknown } {
    if (typeof this.body === 'string') {
      return {
        status: this.statusCode,
        headers: this.headers,
        body: this.body,
      };
    }

    return {
      status: this.statusCode,
      headers: this.headers,
      jsonBody: this.body,
    };
  }
}
