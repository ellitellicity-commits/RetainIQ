import React, { useRef } from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

const ROW_HEIGHT = 52;
const MAX_VIEWPORT_HEIGHT = 640;

const th = {
  textAlign: "left",
  padding: "13px 16px",
  color: "var(--text2)",
  fontWeight: 500,
  fontSize: 14,
  whiteSpace: "nowrap",
  userSelect: "none",
};
const td = { padding: "14px 16px", color: "var(--text)", fontSize: 15 };

const SORT_ICON = {
  asc: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
  ),
  desc: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
  ),
};

// Shared table shell built on @tanstack/react-table. Handles horizontal overflow
// with a dedicated scroll container (rather than per-page CSS patches) so badges/
// columns near the right edge scroll into view instead of clipping.
export default function DataTable({ columns, data, onRowClick, emptyMessage = "No results.", loading = false, minWidth = 720, sorting, onSortingChange, getRowId }) {
  const table = useReactTable({
    data,
    columns,
    state: sorting !== undefined ? { sorting } : undefined,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  const rows = table.getRowModel().rows;

  const scrollRef = useRef(null);
  // Row virtualization: only the rows scrolled into view (plus overscan) are
  // ever mounted, so the table stays cheap to render as the row count grows
  // well past what's currently seeded (rather than mounting every row and
  // relying on the browser to skip painting the offscreen ones).
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div
      ref={scrollRef}
      className="riq-table-scroll"
      style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "auto", WebkitOverflowScrolling: "touch", maxHeight: MAX_VIEWPORT_HEIGHT }}
    >
      <table style={{ width: "100%", minWidth, borderCollapse: "collapse", fontFamily: "Inter" }}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} style={{ background: "var(--card)" }}>
              {hg.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                const align = header.column.columnDef.meta?.align;
                return (
                  <th
                    key={header.id}
                    onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                    style={{ ...th, textAlign: align || "left", cursor: sortable ? "pointer" : "default", width: header.column.columnDef.meta?.width, position: "sticky", top: 0, background: "var(--card)", zIndex: 1 }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, justifyContent: align === "right" ? "flex-end" : "flex-start", width: align === "right" ? "100%" : "auto" }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sortable && (
                        <span style={{ display: "flex", opacity: sortDir ? 1 : 0.35, color: "var(--brand-bright)" }}>
                          {SORT_ICON[sortDir || "desc"]}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true"><td colSpan={columns.length} style={{ padding: 0, border: 0, height: paddingTop }} /></tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                style={{ borderTop: "1px solid var(--border)", cursor: onRowClick ? "pointer" : "default", transition: "background 0.12s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {row.getVisibleCells().map((cell) => {
                  const align = cell.column.columnDef.meta?.align;
                  return (
                    <td key={cell.id} style={{ ...td, textAlign: align || "left" }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden="true"><td colSpan={columns.length} style={{ padding: 0, border: 0, height: paddingBottom }} /></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ ...td, textAlign: "center", color: "var(--text3)", padding: "32px" }}>{emptyMessage}</td></tr>
          )}
          {loading && (
            <tr><td colSpan={columns.length} style={{ ...td, textAlign: "center", color: "var(--text3)", padding: "32px" }}>Loading…</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
