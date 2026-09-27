"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import Button from "./Button";
import styles from "./Table.module.scss";

const PAGE_SIZE = 50;
const CHECKBOX_WIDTH = 44;

function readHiddenColumns(tableId) {
  if (!tableId || typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(`billkaro:table:${tableId}`) || "[]"); } catch { return []; }
}

function HeaderCheckbox({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange}/>;
}

export default function Table({ tableId, columns, rows, rowKey, emptyState, pageSize = PAGE_SIZE, selectable = false, bulkActions }) {
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState(() => new Set(readHiddenColumns(tableId)));
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef(null);
  const [draftFilters, setDraftFilters] = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) { setPrevRows(rows); setPage(1); setSelectedKeys(new Set()); }

  useEffect(() => {
    function onClickOutside(event) { if (viewRef.current && !viewRef.current.contains(event.target)) setViewOpen(false); }
    if (viewOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [viewOpen]);

  function toggleColumn(key) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      if (tableId) { try { localStorage.setItem(`billkaro:table:${tableId}`, JSON.stringify([...next])); } catch { /* storage unavailable */ } }
      return next;
    });
  }

  function toggleSort(column) {
    setSort((prev) => {
      if (!prev || prev.key !== column.key) return { key: column.key, direction: "asc" };
      if (prev.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
  }

  function toggleRow(key) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function applyFilters() { setAppliedFilters(draftFilters); setPage(1); }
  function clearFilters() { setDraftFilters({}); setAppliedFilters({}); setPage(1); }

  const visibleColumns = useMemo(() => columns.filter((c) => !hidden.has(c.key)), [columns, hidden]);
  const filterableColumns = useMemo(() => columns.filter((c) => c.filterable), [columns]);
  const hasActiveFilters = Object.values(appliedFilters).some((v) => v !== "" && v != null);

  const filteredRows = useMemo(() => {
    const active = Object.entries(appliedFilters).filter(([, v]) => v !== "" && v != null);
    if (!active.length) return rows;
    return rows.filter((row) => active.every(([key, value]) => {
      const column = columns.find((c) => c.key === key);
      if (!column?.filterValue) return true;
      const rowValue = column.filterValue(row);
      if (column.filterType === "select") return String(rowValue) === value;
      return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
    }));
  }, [rows, appliedFilters, columns]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return filteredRows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const av = column.sortValue(a); const bv = column.sortValue(b);
      if (av === bv) return 0;
      return av > bv ? factor : -factor;
    });
  }, [filteredRows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = sortedRows.length ? (currentPage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(currentPage * pageSize, sortedRows.length);

  const pageSelectedCount = pageRows.filter((row) => selectedKeys.has(rowKey(row))).length;
  const allPageSelected = pageRows.length > 0 && pageSelectedCount === pageRows.length;
  function toggleSelectAllOnPage() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((row) => next.delete(rowKey(row)));
      else pageRows.forEach((row) => next.add(rowKey(row)));
      return next;
    });
  }
  const selectedRows = useMemo(() => selectable && selectedKeys.size ? sortedRows.filter((row) => selectedKeys.has(rowKey(row))) : [], [selectable, selectedKeys, sortedRows, rowKey]);

  const pinnedLeft = useMemo(() => {
    const offsets = {}; let acc = selectable ? CHECKBOX_WIDTH : 0;
    for (const column of visibleColumns) { if (column.pinned) { offsets[column.key] = acc; acc += column.width || 140; } }
    return offsets;
  }, [visibleColumns, selectable]);

  return <div className={styles.wrapper}>
    {!!filterableColumns.length && <div className={styles.filterBar}>
      {filterableColumns.map((column) => (
        <div key={column.key} className={styles.filterField}>
          <label>{column.label}</label>
          {column.filterType === "select"
            ? <select value={draftFilters[column.key] ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, [column.key]: e.target.value }))}>
                <option value="">All</option>
                {column.filterOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            : <input value={draftFilters[column.key] ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, [column.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && applyFilters()} placeholder={`Filter by ${column.label.toLowerCase()}`}/>}
        </div>
      ))}
      <div className={styles.filterActions}>
        <Button size="sm" icon={<Search size={14}/>} onClick={applyFilters}>Search</Button>
        {hasActiveFilters && <Button size="sm" variant="secondary" icon={<X size={14}/>} onClick={clearFilters}>Clear</Button>}
      </div>
    </div>}
    <div className={styles.toolbar}>
      <span className={styles.count}>{sortedRows.length} {sortedRows.length === 1 ? "record" : "records"}</span>
      <div className={styles.toolbarActions}>
        {selectedRows.length > 0 && bulkActions?.(selectedRows)}
        <div className={styles.viewControl} ref={viewRef}>
          <Button variant="secondary" size="sm" icon={<SlidersHorizontal size={14}/>} onClick={() => setViewOpen((v) => !v)}>View</Button>
          {viewOpen && <div className={styles.viewPanel}>
            {columns.filter((c) => c.hideable !== false).map((c) => (
              <label key={c.key}><input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggleColumn(c.key)}/> {c.label}</label>
            ))}
          </div>}
        </div>
      </div>
    </div>
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead><tr>
          {selectable && <th className={styles.pinned} style={{ width: CHECKBOX_WIDTH, left: 0 }}>
            <HeaderCheckbox checked={allPageSelected} indeterminate={pageSelectedCount > 0 && !allPageSelected} onChange={toggleSelectAllOnPage}/>
          </th>}
          {visibleColumns.map((column) => {
          const isSorted = sort?.key === column.key;
          return <th key={column.key} className={column.pinned ? styles.pinned : ""} style={{ textAlign: column.align || "left", width: column.width, left: pinnedLeft[column.key] }}>
            {column.sortable ? <button className={styles.sortButton} onClick={() => toggleSort(column)}>
              {column.label}
              {isSorted ? (sort.direction === "asc" ? <ChevronUp size={13}/> : <ChevronDown size={13}/>) : <ChevronsUpDown size={13} className={styles.sortIdle}/>}
            </button> : column.label}
          </th>;
        })}</tr></thead>
        <tbody>{pageRows.map((row) => {
          const key = rowKey(row);
          return <tr key={key}>
            {selectable && <td className={styles.pinned} style={{ width: CHECKBOX_WIDTH, left: 0 }}>
              <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleRow(key)}/>
            </td>}
            {visibleColumns.map((column) => (
              <td key={column.key} className={column.pinned ? styles.pinned : ""} style={{ textAlign: column.align || "left", width: column.width, left: pinnedLeft[column.key] }}>{column.render(row)}</td>
            ))}
          </tr>;
        })}</tbody>
      </table>
    </div>
    {!sortedRows.length && emptyState}
    {sortedRows.length > pageSize && <div className={styles.pagination}>
      <span>{rangeStart}–{rangeEnd} of {sortedRows.length}</span>
      <div className={styles.pageButtons}>
        <Button variant="secondary" size="sm" icon={<ChevronLeft size={15}/>} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
        <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>Next <ChevronRight size={15}/></Button>
      </div>
    </div>}
  </div>;
}
