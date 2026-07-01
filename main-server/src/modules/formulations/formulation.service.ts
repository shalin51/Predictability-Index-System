import type {
  FormulationListItem,
  FormulationDetailDto,
  CreateFormulationDto,
  UpdateFormulationDto,
  PaginatedResponse,
} from '@amfpi/shared';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { AuditService } from '../audit/audit.service';
import { NotFoundError, ConflictError, ValidationError } from '../../errors/app-error';

export class FormulationService {
  constructor(
    private readonly repo: FormulationRepository,
    private readonly audit: AuditService
  ) {}

  async list(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<FormulationListItem>> {
    const offset = (page - 1) * pageSize;
    const { data, total } = await this.repo.findAll(pageSize, offset);
    return {
      data,
      total,
      page,
      pageSize,
      timestamp: new Date().toISOString(),
    };
  }

  async getById(id: string): Promise<FormulationDetailDto> {
    const formulation = await this.repo.findById(id);
    if (!formulation) throw new NotFoundError(`Formulation ${id}`);
    return formulation;
  }

  async create(dto: CreateFormulationDto, createdBy: string): Promise<FormulationDetailDto> {
    this.validateCreateDto(dto);

    // Check for duplicate code
    const existing = await this.repo.findByCode(dto.formulationCode);
    if (existing) {
      throw new ConflictError(`Formulation code '${dto.formulationCode}' already exists`);
    }

    const created = await this.repo.create({ ...dto, createdBy });

    await this.audit.log({
      tableName: 'formulations',
      recordId: created.id,
      action: 'INSERT',
      changedBy: createdBy,
      newValues: created as unknown as Record<string, unknown>,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateFormulationDto,
    changedBy: string
  ): Promise<FormulationDetailDto> {
    this.validateUpdateDto(dto);

    const before = await this.repo.findById(id);
    if (!before) throw new NotFoundError(`Formulation ${id}`);

    const updated = await this.repo.update(id, dto);
    if (!updated) throw new NotFoundError(`Formulation ${id}`);

    await this.audit.log({
      tableName: 'formulations',
      recordId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  private validateCreateDto(dto: CreateFormulationDto): void {
    if (!dto.formulationCode?.trim()) {
      throw new ValidationError('formulationCode is required');
    }
    this.validateProducedDate(dto.producedDate);
    this.validateResinComponents(dto.resinComponents, true);
    this.validateManufacturingData(dto.manufacturingData);
  }

  private validateUpdateDto(dto: UpdateFormulationDto): void {
    if (Object.keys(dto).length === 0) {
      throw new ValidationError('At least one field must be provided');
    }
    this.validateProducedDate(dto.producedDate);
    this.validateResinComponents(dto.resinComponents, false);
    this.validateManufacturingData(dto.manufacturingData);
  }

  private validateProducedDate(value: string | undefined): void {
    if (value === undefined) {
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new ValidationError('producedDate must be in YYYY-MM-DD format');
    }
  }

  private validateResinComponents(
    resinComponents: CreateFormulationDto['resinComponents'] | undefined,
    required: boolean
  ): void {
    if (resinComponents === undefined) {
      if (required) {
        throw new ValidationError('resinComponents are required');
      }
      return;
    }

    if (resinComponents.length === 0) {
      throw new ValidationError('resinComponents must include at least one item');
    }

    let total = 0;
    const seenComponents = new Set<string>();
    for (const component of resinComponents) {
      if (!component.resinComponent?.trim()) {
        throw new ValidationError('resinComponent is required');
      }
      if (!component.materialSupplier?.trim()) {
        throw new ValidationError('materialSupplier is required');
      }
      const componentKey = component.resinComponent.trim().toLowerCase();
      if (seenComponents.has(componentKey)) {
        throw new ValidationError('resinComponents must not repeat the same resinComponent');
      }
      seenComponents.add(componentKey);
      if (!Number.isFinite(component.percentComposition) || component.percentComposition <= 0 || component.percentComposition > 100) {
        throw new ValidationError('percentComposition must be greater than 0 and at most 100');
      }
      total += component.percentComposition;
    }

    if (Math.abs(total - 100) > 0.001) {
      throw new ValidationError('resinComponents percentComposition must total 100');
    }
  }

  private validateManufacturingData(dto: CreateFormulationDto['manufacturingData'] | undefined): void {
    if (!dto) {
      return;
    }

    const numericFields = [
      'injectionPressure',
      'meltTemperature',
      'coolingTime',
      'cycleTime',
    ] as const;

    for (const field of numericFields) {
      const value = dto[field];
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new ValidationError(`${field} must be a non-negative number`);
      }
    }
  }
}
