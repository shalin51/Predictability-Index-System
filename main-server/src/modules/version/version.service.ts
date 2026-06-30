import { config } from '../../config/env';

export interface VersionResponse {
  version: string;
  appEnv: string;
  service: string;
}

export class VersionService {
  getVersion(): VersionResponse {
    return {
      version: '1.0.0',
      appEnv: config.appEnv,
      service: 'main-server',
    };
  }
}
