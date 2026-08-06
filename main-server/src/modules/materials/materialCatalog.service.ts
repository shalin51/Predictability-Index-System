import { NotFoundError } from '../../errors/app-error';
import type { MaterialCatalogRepository } from './materialCatalog.repository';

export class MaterialCatalogService {
  constructor(private readonly repository: MaterialCatalogRepository) {}

  async detail(id: string): Promise<Record<string, unknown>> {
    const material = await this.repository.detail(id);
    if (!material) throw new NotFoundError('Material not found');
    return material;
  }
}
