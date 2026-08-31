import type { PredictionInputSnapshot, ProcessorPredictionResponse } from './prediction.types';

export class PredictionProcessorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PredictionProcessorError';
  }
}

export class PredictionClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMillis: number
  ) {}

  async predict(modelId: string, input: PredictionInputSnapshot): Promise<ProcessorPredictionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMillis);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/predictions?model_id=${encodeURIComponent(modelId)}`, {
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { detail?: string } | null;
        throw new PredictionProcessorError(body?.detail || `Prediction processor returned ${response.status}`);
      }
      return await response.json() as ProcessorPredictionResponse;
    } catch (error) {
      if (error instanceof PredictionProcessorError) throw error;
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Prediction processor timed out'
        : 'Prediction processor is unavailable';
      throw new PredictionProcessorError(message);
    } finally {
      clearTimeout(timeout);
    }
  }
}
