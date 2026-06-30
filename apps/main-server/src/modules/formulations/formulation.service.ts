import type {
  Formulation,
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

  async create(dto: CreateFormulationDto, createdBy: string): Promise<Formulation> {
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
  ): Promise<Formulation> {
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
    if (!dto.name?.trim()) {
      throw new ValidationError('name is required');
    }
    if (dto.batchSizeKg !== undefined && dto.batchSizeKg <= 0) {
      throw new ValidationError('batchSizeKg must be positive');
    }
  }

  private validateUpdateDto(dto: UpdateFormulationDto): void {
    if (Object.keys(dto).length === 0) {
      throw new ValidationError('At least one field must be provided');
    }
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new ValidationError('name cannot be empty');
    }
    if (dto.batchSizeKg !== undefined && dto.batchSizeKg <= 0) {
      throw new ValidationError('batchSizeKg must be positive');
    }
  }
}
