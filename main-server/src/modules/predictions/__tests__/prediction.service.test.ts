import { describe, expect, it, vi } from 'vitest';
import { PredictionService } from '../prediction.service';
import type { PredictionInputSnapshot, PredictionRecord } from '../prediction.types';

const runId = '11111111-1111-4111-8111-111111111111';
const executionId = '33333333-3333-4333-8333-333333333333';
const modelId = '22222222-2222-4222-8222-222222222222';
const input: PredictionInputSnapshot = {
  environment_observations: [],
  formula: {
    components: [{ basis: 'weight_percent', material_code: 'A', material_id: runId, percent_composition: 100 }],
    formulation_code: 'F-1',
    formulation_id: runId,
    version_no: 1,
  },
  machine_code: 'M-1',
  machine_id: runId,
  mold_code: 'MO-1',
  mold_id: runId,
  process: {},
  process_parameters: [],
};

function makeRepository(overrides: Record<string, unknown> = {}) {
  const running = {
    completedAt: null, failureMessage: null, generatedAt: '2026-01-01', id: executionId,
    metrics: [], modelId, productionRunId: runId, requestedBy: 'user', startedAt: '2026-01-01', status: 'running' as const,
  } satisfies PredictionRecord;
  return {
    complete: vi.fn().mockResolvedValue({ ...running, completedAt: '2026-01-01', status: 'completed' }),
    fail: vi.fn().mockResolvedValue(undefined),
    getModelStatus: vi.fn().mockResolvedValue('active'),
    inputForRun: vi.fn().mockResolvedValue(input),
    listForRun: vi.fn(),
    start: vi.fn().mockResolvedValue(running),
    ...overrides,
  };
}

describe('PredictionService', () => {
  it('sends the canonical snapshot and persists the processor response', async () => {
    const saved = {
      completedAt: '2026-01-01', failureMessage: null, generatedAt: '2026-01-01', id: executionId,
      metrics: [], modelId, productionRunId: runId, requestedBy: 'user', startedAt: '2026-01-01', status: 'completed',
    } satisfies PredictionRecord;
    const repository = makeRepository({ complete: vi.fn().mockResolvedValue(saved) });
    const client = { predict: vi.fn().mockResolvedValue({ model_id: modelId, predictions: { hardness: 72.5 } }) };
    const audit = { log: vi.fn().mockResolvedValue(undefined) };
    const service = new PredictionService(repository as never, client as never, modelId, 'Test model', audit as never, 900_000);

    await expect(service.generate(runId, 'user')).resolves.toEqual({ ...saved, modelLabel: 'Test model' });
    expect(client.predict).toHaveBeenCalledWith(modelId, input);
    expect(repository.start).toHaveBeenCalledWith(runId, modelId, 'user', input, 900_000);
    expect(repository.complete).toHaveBeenCalledWith(executionId, { hardness: 72.5 });
    expect(audit.log).toHaveBeenCalledOnce();
  });

  it('rejects a run whose formulation is incomplete', async () => {
    const incomplete = structuredClone(input);
    incomplete.formula.components[0]!.percent_composition = 90;
    const repository = makeRepository({ inputForRun: vi.fn().mockResolvedValue(incomplete) });
    const client = { predict: vi.fn() };
    const service = new PredictionService(repository as never, client as never, modelId, 'Test model', { log: vi.fn() } as never, 900_000);

    await expect(service.generate(runId, 'user')).rejects.toThrow('Formulation composition must total 100');
    expect(client.predict).not.toHaveBeenCalled();
    expect(repository.start).not.toHaveBeenCalled();
  });

  it('rejects when the requested model is not active', async () => {
    const repository = makeRepository({ getModelStatus: vi.fn().mockResolvedValue('inactive') });
    const client = { predict: vi.fn() };
    const service = new PredictionService(repository as never, client as never, modelId, 'Test model', { log: vi.fn() } as never, 900_000);

    await expect(service.generate(runId, 'user')).rejects.toThrow('Prediction model is not active');
    expect(client.predict).not.toHaveBeenCalled();
    expect(repository.start).not.toHaveBeenCalled();
  });

  it('marks the execution failed and rethrows when the processor call fails', async () => {
    const repository = makeRepository();
    const client = { predict: vi.fn().mockRejectedValue(new Error('Prediction processor is unavailable')) };
    const service = new PredictionService(repository as never, client as never, modelId, 'Test model', { log: vi.fn() } as never, 900_000);

    await expect(service.generate(runId, 'user')).rejects.toThrow('Prediction processor is unavailable');
    expect(repository.fail).toHaveBeenCalledWith(executionId, 'Prediction processor is unavailable');
    expect(repository.complete).not.toHaveBeenCalled();
  });

  it('fails the execution when the processor returns an unexpected model id', async () => {
    const repository = makeRepository();
    const client = { predict: vi.fn().mockResolvedValue({ model_id: 'other-model', predictions: { hardness: 1 } }) };
    const service = new PredictionService(repository as never, client as never, modelId, 'Test model', { log: vi.fn() } as never, 900_000);

    await expect(service.generate(runId, 'user')).rejects.toThrow('Prediction processor returned an unexpected model');
    expect(repository.fail).toHaveBeenCalledWith(executionId, 'Prediction processor returned an unexpected model');
  });

  it('fails the execution when the processor returns a non-finite metric', async () => {
    const repository = makeRepository();
    const client = { predict: vi.fn().mockResolvedValue({ model_id: modelId, predictions: { hardness: Number.NaN } }) };
    const service = new PredictionService(repository as never, client as never, modelId, 'Test model', { log: vi.fn() } as never, 900_000);

    await expect(service.generate(runId, 'user')).rejects.toThrow('Prediction processor returned invalid metrics');
    expect(repository.fail).toHaveBeenCalledWith(executionId, 'Prediction processor returned invalid metrics');
  });

  it('returns the successful prediction even when writing the audit log fails', async () => {
    const saved = {
      completedAt: '2026-01-01', failureMessage: null, generatedAt: '2026-01-01', id: executionId,
      metrics: [], modelId, productionRunId: runId, requestedBy: 'user', startedAt: '2026-01-01', status: 'completed',
    } satisfies PredictionRecord;
    const repository = makeRepository({ complete: vi.fn().mockResolvedValue(saved) });
    const client = { predict: vi.fn().mockResolvedValue({ model_id: modelId, predictions: { hardness: 72.5 } }) };
    const audit = { log: vi.fn().mockRejectedValue(new Error('audit db unavailable')) };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = new PredictionService(repository as never, client as never, modelId, 'Test model', audit as never, 900_000);

    await expect(service.generate(runId, 'user')).resolves.toEqual({ ...saved, modelLabel: 'Test model' });
    expect(repository.fail).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
