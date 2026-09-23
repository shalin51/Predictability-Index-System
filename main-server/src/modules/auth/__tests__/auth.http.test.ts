import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app';
import { config } from '../../../config/env';

describe('authentication HTTP flow', () => {
  const originalMode = config.auth.mode;
  beforeEach(() => { config.auth.mode = 'password'; });
  afterEach(() => { config.auth.mode = originalMode; });
  it('keeps health public and protects other routes', async () => {
    expect((await request(createApp()).get('/health')).status).toBe(200);
    expect((await request(createApp()).get('/not-a-route')).status).toBe(401);
  });

  it('issues a JWT for valid dashboard credentials', async () => {
    const login = await request(createApp())
      .post('/auth/login')
      .send({ userName: config.auth.userName, password: config.auth.userPassword });

    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
    expect(login.headers['cache-control']).toBe('no-store');

    const authenticated = await request(createApp())
      .get('/not-a-route')
      .set('authorization', `Bearer ${login.body.token}`);
    expect(authenticated.status).toBe(404);
  });

  it('accepts the API key and rejects invalid dashboard credentials', async () => {
    const apiClient = await request(createApp())
      .get('/not-a-route')
      .set('x-api-key', config.auth.apiKey);
    expect(apiClient.status).toBe(404);

    const login = await request(createApp())
      .post('/auth/login')
      .send({ userName: config.auth.userName, password: 'invalid-password' });
    expect(login.status).toBe(401);
  });

  it('rejects the old login and invalid bearer tokens in Entra mode', async () => {
    config.auth.mode = 'entra';
    const login = await request(createApp())
      .post('/auth/login')
      .send({ userName: config.auth.userName, password: config.auth.userPassword });
    expect(login.status).toBe(401);

    const protectedRequest = await request(createApp())
      .get('/not-a-route')
      .set('authorization', 'Bearer invalid-token');
    expect(protectedRequest.status).toBe(401);
  });
});
