import { HttpRequest } from '@azure/functions';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../app';
import { handleApiRequest } from '../../../runtime/dispatcher';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('setup import HTTP body handling', () => {
  it('rejects unsupported Express content types', async () => {
    const response = await request(createApp())
      .post('/setup-sheet-imports/preview')
      .set('content-type', 'application/json')
      .send({ file: 'no' });
    expect(response.status).toBe(415);
    expect(response.body.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects macro workbook filenames before storage or database access', async () => {
    const response = await request(createApp())
      .post('/setup-sheet-imports/preview')
      .set('content-type', XLSX_TYPE)
      .set('x-file-name', 'setup.xlsm')
      .send(Buffer.from('PK'));
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Only \.xlsx/);
  });

  it('enforces the Express 10 MB limit', async () => {
    const response = await request(createApp())
      .post('/setup-sheet-imports/preview')
      .set('content-type', XLSX_TYPE)
      .set('x-file-name', 'setup.xlsx')
      .send(Buffer.alloc(10 * 1024 * 1024 + 1));
    expect(response.status).toBe(413);
    expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects unsupported Azure Functions content types', async () => {
    const response = await handleApiRequest(new HttpRequest({
      method: 'POST',
      url: 'https://example.test/api/setup-sheet-imports/preview',
      headers: { 'content-type': 'text/plain' },
      body: { string: 'not-xlsx' },
    }), {} as never);
    expect(response.status).toBe(415);
    expect(response.jsonBody).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  it('enforces the Azure Functions 10 MB limit', async () => {
    const response = await handleApiRequest(new HttpRequest({
      method: 'POST',
      url: 'https://example.test/api/setup-sheet-imports/preview',
      headers: { 'content-type': XLSX_TYPE, 'x-file-name': 'setup.xlsx' },
      body: { bytes: Buffer.alloc(10 * 1024 * 1024 + 1) },
    }), {} as never);
    expect(response.status).toBe(413);
    expect(response.jsonBody).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });
});
