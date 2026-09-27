"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, ArrowUpRight, Edit3, History, Plus, ReceiptText, Trash2 } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import CustomerForm from "@/components/CustomerForm";
import EntryForm from "@/components/EntryForm";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import RowActions from "@/components/ui/RowActions";
import Table from "@/components/ui/Table";
import { useAuth } from "@/context/AuthContext";
import { addCredit, createBill, deleteEntry, updateCustomer, updateEntry } from "@/services/billingService";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

export default function CustomerDetail() {
  const { id } = useParams(); const { effectiveUid } = useAuth();
  const { customers, bills: allBills, credits: allCredits, audits } = useSelector((s) => s.data);
  const customer = useMemo(() => customers.find((p) => p.id === id), [customers, id]);
  const [modal, setModal] = useState(null); const [editing, setEditing] = useState(null); const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null); const [deleteReason, setDeleteReason] = useState(""); const [deleteBusy, setDeleteBusy] = useState(false);
  const bills = useMemo(() => allBills.filter((b) => b.customerId === id).sort((a, b) => entryTime(b.createdAt) - entryTime(a.createdAt)), [id, allBills]);
  const billIds = useMemo(() => bills.map((b) => b.id), [bills]);
  const credits = useMemo(() => allCredits.filter((c) => billIds.includes(c.billId)).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt))), [billIds, allCredits]);
  const total = bills.reduce((s, b) => s + Number(b.amount), 0); const paid = credits.reduce((s, c) => s + Number(c.amount), 0);
  async function saveBill(values) { await createBill(effectiveUid, id, values); setModal(null); }
  async function saveCredit(values) { await addCredit(effectiveUid, modal.billId, values); setModal(null); }
  async function saveCustomer(values, reason) { await updateCustomer(effectiveUid, id, customer, values, reason); setModal(null); }
  async function saveEdit(values, reason) { const collectionName = editing.type === "bill" ? "bills" : "credits"; await updateEntry(effectiveUid, collectionName, editing.item.id, editing.item, values, reason); setEditing(null); }
  async function confirmDelete() {
    setDeleteBusy(true);
    try { await deleteEntry(effectiveUid, "bills", deleting.item.id, deleting.item, deleteReason); setDeleting(null); setDeleteReason(""); } finally { setDeleteBusy(false); }
  }
  const columns = [
    { key: "billId", label: "Bill ID", pinned: true, width: 120, sortable: true, filterable: true, filterValue: (bill) => bill.billId || customer?.billId || "", sortValue: (bill) => bill.billId || customer?.billId || "", render: (bill) => <span className="table-code">{bill.billId || customer?.billId || "-"}</span> },
    { key: "bill", label: "Bill", pinned: true, width: 190, sortable: true, filterable: true, filterValue: (bill) => bill.description, sortValue: (bill) => bill.description, render: (bill) => <div className="entity-cell"><span className="person-icon compact"><ReceiptText size={16}/></span>{bill.description}</div> },
    { key: "date", label: "Date", width: 110, sortable: true, sortValue: (bill) => bill.billDate, render: (bill) => formatDate(bill.billDate) },
    { key: "status", label: "Status", width: 100, sortable: true, filterable: true, filterType: "select", filterOptions: [{ value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }, { value: "cancelled", label: "Cancelled" }], filterValue: (bill) => bill.status || "pending", sortValue: (bill) => bill.status || "pending", render: (bill) => <Badge tone={bill.status || "pending"}/> },
    { key: "installments", label: "Installments", align: "right", width: 110, sortable: true, sortValue: (bill) => credits.filter((c) => c.billId === bill.id).length, render: (bill) => credits.filter((c) => c.billId === bill.id).length },
    { key: "billed", label: "Billed", align: "right", width: 110, sortable: true, sortValue: (bill) => Number(bill.amount), render: (bill) => formatCurrency(bill.amount) },
    { key: "paid", label: "Paid", align: "right", width: 110, sortable: true, sortValue: (bill) => credits.filter((c) => c.billId === bill.id).reduce((s, c) => s + Number(c.amount), 0), render: (bill) => <span className="green">{formatCurrency(credits.filter((c) => c.billId === bill.id).reduce((s, c) => s + Number(c.amount), 0))}</span> },
    { key: "left", label: "Left", align: "right", width: 110, sortable: true, sortValue: (bill) => Number(bill.amount) - credits.filter((c) => c.billId === bill.id).reduce((s, c) => s + Number(c.amount), 0), render: (bill) => formatCurrency(Number(bill.amount) - credits.filter((c) => c.billId === bill.id).reduce((s, c) => s + Number(c.amount), 0)) },
    { key: "history", label: "History", width: 90, render: (bill) => <button className="text-button" onClick={() => setHistory({ title: bill.description, ids: [bill.id], amountOnly: true })}><History size={15}/> View</button> },
    { key: "actions", label: "Actions", align: "right", width: 130, hideable: false, render: (bill) => {
      const billWithId = { ...bill, billId: bill.billId || customer.billId || "" };
      return <RowActions actions={[
        { label: "Edit", icon: <Edit3 size={15}/>, onClick: () => setEditing({ type: "bill", item: billWithId }) },
        { label: "Delete", icon: <Trash2 size={15}/>, variant: "danger", onClick: () => setDeleting({ item: billWithId }) },
        { label: "Open", icon: <ArrowUpRight size={15}/>, href: `/bills/${bill.id}` },
      ]}/>;
    } },
  ];
  if (!customer) return <AppShell title="Customer ledger" subtitle="Loading customer..."><div className="spinner" /></AppShell>;
  return <AppShell title={customer.name} subtitle={customer.primaryContact} action={<Button variant="secondary" icon={<Edit3 size={17}/>} onClick={() => setModal({ type: "customer" })}>Edit details</Button>}>
    <Link href="/customers" className="back-link"><ArrowLeft size={16}/> All customers</Link>
    <section className="ledger-summary"><article><span>Total billed</span><strong>{formatCurrency(total)}</strong></article><article><span>Total paid</span><strong className="green">{formatCurrency(paid)}</strong></article><article className="balance"><span>Balance left</span><strong>{formatCurrency(total - paid)}</strong></article></section>
    <div className="section-heading"><div><h2>Bills & installments</h2><p>Add payments against a specific bill and follow its timeline.</p></div><Button icon={<Plus size={18}/>} onClick={() => setModal({ type: "bill" })}>Add bill</Button></div>
    <Table tableId="customer-bills" columns={columns} rows={bills} rowKey={(bill) => bill.id} emptyState={<EmptyState card={false} icon={<ReceiptText/>} title="No bills found" description="Add a bill or change the filters."/>}/>
    <Modal open={modal?.type === "bill"} onClose={() => setModal(null)} title="Add a bill" subtitle={`Create a new bill for ${customer.name}.`}><EntryForm type="bill" onSubmit={saveBill}/></Modal>
    <Modal open={modal?.type === "credit"} onClose={() => setModal(null)} title="Record a payment" subtitle="Add a manual installment against this bill."><EntryForm type="credit" onSubmit={saveCredit}/></Modal>
    <Modal open={modal?.type === "customer"} onClose={() => setModal(null)} title="Correct customer details" subtitle="Every edit is recorded; a reason is optional."><CustomerForm initial={customer} showReason submitLabel="Save correction" onSubmit={saveCustomer}/></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={`Correct ${editing?.type || "entry"}`} subtitle="The original and corrected values will remain in history.">{editing && <EntryForm type={editing.type} initial={editing.item} showReason onSubmit={saveEdit}/>}</Modal>
    <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} busy={deleteBusy} title="Delete bill" subtitle="It will be removed from the ledger; the record and audit trail are kept." itemLabel="this bill" reason={deleteReason} onReasonChange={setDeleteReason}/>
    <HistoryDrawer open={!!history} onClose={() => setHistory(null)} title={history?.title} audits={audits} entityIds={history?.ids || []} amountOnly={history?.amountOnly}/>
  </AppShell>;
}

function entryTime(value) {
  if (value?.seconds) return value.seconds;
  if (value?.toDate) return value.toDate().getTime();
  return value ? new Date(value).getTime() || 0 : 0;
}

function HistoryDrawer({ open, onClose, title, audits, entityIds, amountOnly }) {
  return <aside className={`side-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
    <button className="drawer-scrim" onClick={onClose} aria-label="Close history" />
    <section className="drawer-panel">
      <div className="drawer-head"><div><span className="eyebrow">History</span><h2>{title || "Correction history"}</h2></div><Button variant="secondary" size="sm" onClick={onClose}>Close</Button></div>
      <AuditHistory audits={audits} entityIds={entityIds} amountOnly={amountOnly}/>
    </section>
  </aside>;
}

function AuditHistory({ audits, entityIds, amountOnly = false }) {
  const entries = audits.filter((a) => entityIds.includes(a.entityId) && (!amountOnly || a.changes?.before?.amount !== undefined)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  if (!entries.length) return <EmptyState card={false} titleAs="h3" icon={<History/>} title="No corrections made" description="Any future edits and their reasons will appear here."/>;
  return <div className="audit-list">{entries.map((audit) => {
    const changes = changedFields(audit);
    return <article key={audit.id}><div className="audit-dot"/><div><div className="audit-meta"><span>{audit.entityType} corrected</span><time>{formatDateTime(audit.createdAt)}</time></div><strong>{audit.reason}</strong>{changes.length ? <ChangeTable changes={changes}/> : <p>No field-level change detected.</p>}</div></article>;
  })}</div>;
}

function ChangeTable({ changes }) {
  return <table className="change-table"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{changes.map((item) => <tr key={item.key}><td>{item.label}</td><td>{item.before}</td><td>{item.after}</td></tr>)}</tbody></table>;
}

function changedFields(audit) {
  const before = audit.changes?.before || {};
  const after = audit.changes?.after || {};
  return Object.keys(after).filter((key) => !["id", "createdAt", "updatedAt", "customerId"].includes(key) && JSON.stringify(before[key] ?? "") !== JSON.stringify(after[key] ?? "")).map((key) => ({ key, label: fieldLabel(key), before: formatFieldValue(key, before[key]), after: formatFieldValue(key, after[key]) }));
}

function fieldLabel(key) {
  return { billId: "Bill ID", description: "Title", amount: "Amount", billDate: "Bill date", paidAt: "Payment date", note: "Note", status: "Status", name: "Name", primaryContact: "Primary contact", secondaryContact: "Secondary contact" }[key] || key;
}

function formatFieldValue(key, value) {
  if (value === undefined || value === null || value === "") return "-";
  if (key === "amount") return formatCurrency(value);
  if (key === "billDate" || key === "paidAt") return formatDate(value);
  return String(value);
}
