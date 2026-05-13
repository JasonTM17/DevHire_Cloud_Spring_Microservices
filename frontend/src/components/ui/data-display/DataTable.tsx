"use client";

import { useState, useCallback } from "react";

type SortDirection = "asc" | "desc" | null;

type Column = {
  key: string;
  header: string;
  sortable?: boolean;
};

type DataTableProps = {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
  onSort?: (key: string, direction: SortDirection) => void;
  className?: string;
  "data-testid"?: string;
};

export function DataTable({
  columns,
  rows,
  onSort,
  className = "",
  "data-testid": testId,
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = useCallback(
    (key: string) => {
      let nextDirection: SortDirection;
      if (sortKey === key) {
        if (sortDirection === "asc") nextDirection = "desc";
        else if (sortDirection === "desc") nextDirection = null;
        else nextDirection = "asc";
      } else {
        nextDirection = "asc";
      }

      setSortKey(nextDirection ? key : null);
      setSortDirection(nextDirection);
      onSort?.(key, nextDirection);
    },
    [sortKey, sortDirection, onSort]
  );

  return (
    <div className={`dh-data-table__wrapper ${className}`} data-testid={testId}>
      <table className="dh-data-table" role="table">
        <thead className="dh-data-table__head">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`dh-data-table__th ${col.sortable ? "dh-data-table__th--sortable" : ""}`}
                aria-sort={
                  sortKey === col.key && sortDirection
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col.sortable ? (
                  <button
                    className="dh-data-table__sort-btn"
                    onClick={() => handleSort(col.key)}
                    aria-label={`Sort by ${col.header}`}
                  >
                    {col.header}
                    <span className="dh-data-table__sort-icon" aria-hidden="true">
                      {sortKey === col.key && sortDirection === "asc" && "▲"}
                      {sortKey === col.key && sortDirection === "desc" && "▼"}
                      {(sortKey !== col.key || !sortDirection) && "⇅"}
                    </span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="dh-data-table__body">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="dh-data-table__row">
              {columns.map((col) => (
                <td key={col.key} className="dh-data-table__td">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
