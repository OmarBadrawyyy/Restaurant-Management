import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: string | ((item: T) => string);
  striped?: boolean;
  compact?: boolean;
}

function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  isLoading = false,
  className = '',
  onRowClick,
  rowClassName = '',
  striped = true,
  compact = false,
}: DataTableProps<T>) {
  const renderCell = (item: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    
    return item[column.accessor] as React.ReactNode;
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  const getRowClass = (item: T, index: number) => {
    const base = 'transition hover:bg-gray-50';
    const clickable = onRowClick ? 'cursor-pointer' : '';
    const stripedClass = striped && index % 2 === 1 ? 'bg-gray-50' : '';
    
    const customClass = typeof rowClassName === 'function' 
      ? rowClassName(item) 
      : rowClassName;
    
    return `${base} ${stripedClass} ${clickable} ${customClass}`;
  };

  const tablePadding = compact ? 'px-3 py-2' : 'px-6 py-4';

  if (isLoading) {
    return (
      <div className={`bg-white shadow-sm rounded-lg overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className={`${tablePadding} text-xs font-medium text-gray-500 uppercase tracking-wider ${getAlignClass(column.align)}`}
                    style={{ width: column.width }}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className={tablePadding}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white shadow-sm rounded-lg overflow-hidden ${className}`}>
        <div className="p-8 text-center">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow-sm rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`${tablePadding} text-xs font-medium text-gray-500 uppercase tracking-wider ${getAlignClass(column.align)}`}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr 
                key={keyExtractor(item)} 
                className={getRowClass(item, index)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`${tablePadding} whitespace-nowrap text-sm text-gray-900 ${getAlignClass(column.align)}`}
                  >
                    {renderCell(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable; 