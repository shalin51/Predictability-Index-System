import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { promises as fs } from 'fs';
import * as path from 'path';
import { config } from '../../config/env';

export interface SetupImportStorage {
  save(objectKey: string, bytes: Buffer, metadata: Record<string, string>): Promise<void>;
  markCommitted(objectKey: string): Promise<void>;
  remove(objectKey: string): Promise<void>;
}

export class AzureSetupImportStorage implements SetupImportStorage {
  private container?: ContainerClient;

  async save(objectKey: string, bytes: Buffer, metadata: Record<string, string>): Promise<void> {
    const container = this.getContainer();
    await container.createIfNotExists();
    await container.getBlockBlobClient(objectKey).uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      metadata,
      tags: { retention: 'uncommitted' },
    });
  }

  async markCommitted(objectKey: string): Promise<void> {
    await this.getContainer().getBlockBlobClient(objectKey).setTags({ retention: 'committed' });
  }

  async remove(objectKey: string): Promise<void> {
    await this.getContainer().deleteBlob(objectKey, { deleteSnapshots: 'include' });
  }

  private getContainer(): ContainerClient {
    if (this.container) return this.container;
    const settings = config.setupImports;
    if (settings.storageConnectionString) {
      this.container = BlobServiceClient.fromConnectionString(settings.storageConnectionString).getContainerClient(settings.storageContainer);
      return this.container;
    }
    if (settings.storageAccountUrl) {
      this.container = new BlobServiceClient(settings.storageAccountUrl, new DefaultAzureCredential()).getContainerClient(settings.storageContainer);
      return this.container;
    }
    throw new Error('Setup import Blob Storage is not configured');
  }
}

export class LocalSetupImportStorage implements SetupImportStorage {
  constructor(private readonly rootDirectory = path.resolve(process.cwd(), '.local', 'setup-imports')) {}

  async save(objectKey: string, bytes: Buffer, metadata: Record<string, string>): Promise<void> {
    const target = this.resolveTarget(objectKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await Promise.all([
      fs.writeFile(target, bytes),
      fs.writeFile(`${target}.metadata.json`, JSON.stringify({ ...metadata, retention: 'uncommitted' }, null, 2), 'utf8'),
    ]);
  }

  async markCommitted(objectKey: string): Promise<void> {
    const target = this.resolveTarget(objectKey);
    const metadataPath = `${target}.metadata.json`;
    const current = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as Record<string, unknown>;
    await fs.writeFile(metadataPath, JSON.stringify({ ...current, retention: 'committed', committedAt: new Date().toISOString() }, null, 2), 'utf8');
  }

  async remove(objectKey: string): Promise<void> {
    const target = this.resolveTarget(objectKey);
    await Promise.all([
      fs.rm(target, { force: true }),
      fs.rm(`${target}.metadata.json`, { force: true }),
    ]);
  }

  private resolveTarget(objectKey: string): string {
    const target = path.resolve(this.rootDirectory, objectKey);
    const rootPrefix = `${path.resolve(this.rootDirectory)}${path.sep}`;
    if (!target.startsWith(rootPrefix)) throw new Error('Invalid setup import object key');
    return target;
  }
}

export function createSetupImportStorage(): SetupImportStorage {
  if (config.setupImports.storageConnectionString || config.setupImports.storageAccountUrl) {
    return new AzureSetupImportStorage();
  }
  if (config.appEnv === 'dev' || config.appEnv === 'development' || config.nodeEnv === 'test') {
    return new LocalSetupImportStorage();
  }
  throw new Error('Setup import Blob Storage is required outside development');
}
