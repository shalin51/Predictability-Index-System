import { getPool } from '../../infrastructure/database/pg-pool';

interface AuditLogInput {
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changedBy: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export class AuditService {
  async log(entry: AuditLogInput): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.tableName,
        entry.recordId,
        entry.action,
        entry.changedBy,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
      ]
    );
  }
}
