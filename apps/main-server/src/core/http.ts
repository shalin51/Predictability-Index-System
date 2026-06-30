import type { Response } from 'express';

export interface JsonResponseOptions {
  successStatus?: number;
  errorStatus?: (error: Error) => number;
  errorBody?: (error: Error) => unknown;
  unknownErrorMessage?: string;
}

export function respondJson<T>(
  res: Response,
  action: () => Promise<T> | T,
  options: JsonResponseOptions = {}
): void {
  const {
    successStatus = 200,
    errorStatus = () => 500,
    errorBody = (error) => ({ error: error.message }),
    unknownErrorMessage,
  } = options;

  void Promise.resolve()
    .then(action)
    .then((data) => {
      res.status(successStatus).json(data);
    })
    .catch((cause: unknown) => {
      const error = toError(cause, unknownErrorMessage);
      res.status(errorStatus(error)).json(errorBody(error));
    });
}

export function resolveErrorStatus(
  error: Error,
  statusMap: Record<string, number>,
  fallbackStatus = 500
): number {
  return statusMap[error.constructor.name] ?? fallbackStatus;
}

export function toError(cause: unknown, fallbackMessage = 'Unknown error'): Error {
  return cause instanceof Error ? cause : new Error(fallbackMessage);
}
