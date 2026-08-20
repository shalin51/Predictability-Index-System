import { useEffect, useMemo, useState } from 'react';
import { controlStyles } from './controls';

export type SortDirection = 'asc' | 'desc';

export function useTableState<T>(records: readonly T[], getValue: (record: T, key: string) => unknown, initialSort: { key: string; direction?: SortDirection }) {
  const [sort, setSort] = useState({ key: initialSort.key, direction: initialSort.direction ?? 'asc' as SortDirection });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => setPage(1), [records]);
  useEffect(() => setSort({ key: initialSort.key, direction: initialSort.direction ?? 'asc' }), [initialSort.direction, initialSort.key]);

  const sortedRecords = useMemo(() => [...records].sort((left, right) => compare(getValue(left, sort.key), getValue(right, sort.key), sort.direction)), [getValue, records, sort]);
  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRecords = sortedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: string) => {
    setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
    setPage(1);
  };

  return { currentPage, pageCount, pagedRecords, setPage, sort, toggleSort };
}

export function SortButton({ children, column, sort, onSort }: { children: string; column: string; sort: { key: string; direction: SortDirection }; onSort: (key: string) => void }) {
  const active = sort.key === column;
  return <button aria-label={`Sort by ${children}`} onClick={() => onSort(column)} style={controlStyles.tableHeaderButton} type="button">{children}{active ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>;
}

export function TablePagination({ currentPage, pageCount, onPageChange }: { currentPage: number; pageCount: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div style={{ alignItems: 'center', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
      <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} style={controlStyles.subtleButton} type="button">Previous</button>
      <span>Page {currentPage} of {pageCount}</span>
      <button disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)} style={controlStyles.subtleButton} type="button">Next</button>
    </div>
  );
}

function compare(left: unknown, right: unknown, direction: SortDirection) {
  const leftValue = left == null ? '' : String(left);
  const rightValue = right == null ? '' : String(right);
  const numericLeft = Number(leftValue);
  const numericRight = Number(rightValue);
  const result = Number.isFinite(numericLeft) && Number.isFinite(numericRight)
    ? numericLeft - numericRight
    : leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}
