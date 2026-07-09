import type { MouseEventHandler, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { createContext, useContext } from 'react';

interface DataTableContextValue {
  compact: boolean;
  selectableRows: boolean;
}

const DataTableContext = createContext<DataTableContextValue>({
  compact: false,
  selectableRows: false,
});

interface DataTableProps {
  children: ReactNode;
  compact?: boolean;
  minWidth?: number;
  selectableRows?: boolean;
}

interface DataTableRowProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLTableRowElement>;
  selected?: boolean;
}

interface DataTableCellProps extends Pick<TdHTMLAttributes<HTMLTableCellElement>, 'colSpan' | 'rowSpan'> {
  children: ReactNode;
}

interface DataTableHeadProps extends Pick<ThHTMLAttributes<HTMLTableCellElement>, 'colSpan' | 'rowSpan' | 'scope'> {
  children: ReactNode;
}

export function DataTable({
  children,
  compact = false,
  minWidth,
  selectableRows = false,
}: DataTableProps) {
  return (
    <DataTableContext.Provider value={{ compact, selectableRows }}>
      <div className="ui-data-table__scroll">
        <table
          className={`ui-data-table${compact ? ' ui-data-table--compact' : ''}${selectableRows ? ' ui-data-table--selectable' : ''}`}
          style={minWidth ? { minWidth } : undefined}
        >
          {children}
        </table>
      </div>
    </DataTableContext.Provider>
  );
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({ children, onClick, selected = false }: DataTableRowProps) {
  const { selectableRows } = useContext(DataTableContext);
  const interactive = onClick != null;
  return (
    <tr
      aria-selected={selected || undefined}
      className={`ui-data-table__row${interactive ? ' ui-data-table__row--interactive' : ''}${selectableRows && selected ? ' ui-data-table__row--selected' : ''}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function DataTableHead({ children, colSpan, rowSpan, scope = 'col' }: DataTableHeadProps) {
  const { compact } = useContext(DataTableContext);
  return (
    <th
      className={`ui-data-table__head${compact ? ' ui-data-table__head--compact' : ''}`}
      colSpan={colSpan}
      rowSpan={rowSpan}
      scope={scope}
    >
      {children}
    </th>
  );
}

export function DataTableCell({ children, colSpan, rowSpan }: DataTableCellProps) {
  const { compact } = useContext(DataTableContext);
  return (
    <td className={`ui-data-table__cell${compact ? ' ui-data-table__cell--compact' : ''}`} colSpan={colSpan} rowSpan={rowSpan}>
      {children}
    </td>
  );
}
