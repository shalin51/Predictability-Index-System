import { createHash, randomUUID } from 'crypto';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import type { AuditService } from '../audit/audit.service';
import type { MaterialCatalogRepository } from './materialCatalog.repository';

export class MaterialCatalogService {
  constructor(
    private readonly repository: MaterialCatalogRepository,
    private readonly auditService: AuditService
  ) {}

  async detail(id: string): Promise<Record<string, unknown>> {
    const material = await this.repository.detail(id);
    if (!material) throw new NotFoundError('Material not found');
    return material;
  }

  async propertyOptions(materialId: string): Promise<Record<string, unknown>[]> {
    await this.requireMaterial(materialId);
    return this.repository.propertyOptions();
  }

  async createProperty(materialId: string, input: Record<string, unknown>, changedBy: string): Promise<Record<string, unknown>> {
    await this.requireMaterial(materialId);
    const payload = this.normalizePropertyInput(input, true);
    if (!(await this.repository.propertyDefinitionExists(String(payload['propertyDefinitionId'])))) {
      throw new ValidationError('Property definition is inactive or missing');
    }
    const property = await this.repository.createProperty(materialId, {
      ...payload,
      factHash: createHash('sha256').update(`manual:${materialId}:${randomUUID()}`).digest('hex'),
    });
    await this.auditService.log({
      tableName: 'material_property_facts', recordId: String(property['id']), action: 'INSERT', changedBy, newValues: property,
    });
    return property;
  }

  async createPropertyDefinition(input: Record<string, unknown>, changedBy: string): Promise<Record<string, unknown>> {
    const propertyName = String(input['propertyName'] ?? '').trim();
    const category = String(input['category'] ?? '').trim();
    const valueType = String(input['valueType'] ?? 'Numeric').trim();
    const propertyKey = (String(input['propertyKey'] ?? '').trim() || propertyName)
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!propertyName || !category || !propertyKey) throw new ValidationError('Property name and category are required');
    if (await this.repository.propertyDefinitionKeyExists(propertyKey)) throw new ConflictError('Property key already exists');
    const property = await this.repository.createPropertyDefinition({
      category,
      commonUnits: String(input['commonUnits'] ?? '').trim() || null,
      implementationNotes: String(input['implementationNotes'] ?? '').trim() || null,
      propertyKey,
      propertyName,
      valueType,
    });
    await this.auditService.log({
      tableName: 'material_property_definitions', recordId: String(property['id']), action: 'INSERT', changedBy, newValues: property,
    });
    return property;
  }

  async updateProperty(materialId: string, propertyFactId: string, input: Record<string, unknown>, changedBy: string): Promise<Record<string, unknown>> {
    await this.requireMaterial(materialId);
    const before = await this.repository.property(materialId, propertyFactId);
    if (!before) throw new NotFoundError('Material property not found');
    const property = await this.repository.updateProperty(materialId, propertyFactId, this.normalizePropertyInput(input, false));
    if (!property) throw new NotFoundError('Material property not found');
    await this.auditService.log({
      tableName: 'material_property_facts', recordId: propertyFactId, action: 'UPDATE', changedBy, oldValues: before, newValues: property,
    });
    return property;
  }

  private async requireMaterial(materialId: string): Promise<void> {
    if (!materialId || !(await this.repository.exists(materialId))) throw new NotFoundError('Material not found');
  }

  private normalizePropertyInput(input: Record<string, unknown>, requireDefinition: boolean): Record<string, unknown> {
    const propertyDefinitionId = String(input['propertyDefinitionId'] ?? '').trim();
    if (requireDefinition && !propertyDefinitionId) throw new ValidationError('Property is required');
    const numericRaw = input['valueNumeric'];
    const valueNumeric = numericRaw === '' || numericRaw === null || numericRaw === undefined ? null : Number(numericRaw);
    if (valueNumeric !== null && !Number.isFinite(valueNumeric)) throw new ValidationError('Numeric value must be a number');
    const valueText = String(input['valueText'] ?? '').trim() || null;
    if (valueNumeric === null && valueText === null) throw new ValidationError('A numeric or text value is required');
    return {
      propertyDefinitionId: propertyDefinitionId || undefined,
      valueNumeric,
      valueText,
      qualifier: String(input['qualifier'] ?? '').trim() || null,
      unit: String(input['unit'] ?? '').trim() || null,
      testMethod: String(input['testMethod'] ?? '').trim() || 'Manual entry',
      testCondition: String(input['testCondition'] ?? '').trim() || null,
      notes: String(input['notes'] ?? '').trim() || null,
    };
  }
}
