import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
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
