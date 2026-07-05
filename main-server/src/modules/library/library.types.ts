export type LibraryStatus = 'active' | 'inactive' | 'archived';

export interface LibraryListQuery {
  category?: string;
  search?: string;
  status?: LibraryStatus | 'all';
}

export interface LibraryFieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'textarea' | 'select';
}

export interface LibraryEntityConfig {
  columns: string[];
  createFields: LibraryFieldDefinition[];
  defaultOrderBy: string;
  detailSql?: string;
  displayName: string;
  filterColumn?: string;
  idColumn: string;
  listSql: string;
  mutableColumns: string[];
  requiredFields: string[];
  routeKey: string;
  searchColumns: string[];
  statusColumn?: string;
  tableName: string;
  uniqueChecks: Array<{ columns: string[]; message: string }>;
}

export interface LibraryRecord {
  [key: string]: unknown;
  id: string;
}

export interface LibraryCollectionResponse {
  data: LibraryRecord[];
  fields: LibraryFieldDefinition[];
}
