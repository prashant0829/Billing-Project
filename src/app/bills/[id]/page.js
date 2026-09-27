"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ArrowLeft, Banknote, Edit3, History, Plus, ReceiptText, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import EntryForm from "@/components/EntryForm";
import Modal from "@/components/Modal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import RowActions from "@/components/ui/RowActions";
import Table from "@/components/ui/Table";
import { useAuth } from "@/context/AuthContext";
import { addCredit, deleteEntry, updateEntry } from "@/services/billingService";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

export default function BillDetail() {
  const { id } = useParams(); const { effectiveUid } = useAuth(); const router = useRouter();
  const { customers, bills, credits: allCredits, audits } = useSelector((s) => s.data);
  const [modal, setModal] = useState(null); const [editing, setEditing] = useState(null); const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null); const [deleteReason, setDeleteReason] = useState(""); const [deleteBusy, setDeleteBusy] = useState(false);
  const bill = useMemo(() => bills.find((item) => item.id === id), [bills, id]);
  const customer = useMemo(() => customers.find((item) => item.id === bill?.customerId), [bill, customers]);
  const credits = useMemo(() => allCredits.filter((item) => item.billId === id).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt))), [allCredits, id]);
  const transactionRows = useMemo(() => {
    if (!bill) return [];
    return [
      { type: "bill", item: bill, date: bill.billDate },
      ...credits.map((credit) => ({ type: "credit", item: credit, date: credit.paidAt })),
    ].sort((a, b) => entryTime(b.item.createdAt) - entryTime(a.item.createdAt));
  }, [bill, credits]);
  const paid = credits.reduce((sum, item) => sum + Number(item.amount), 0);
  const billWithId = useMemo(() => bill ? { ...bill, billId: bill.billId || customer?.billId || "" } : null, [bill, customer]);
  async function saveCredit(values) { await addCredit(effectiveUid, id, values); setModal(null); }
  async function saveEdit(values, reason) { const collectionName = editing.type === "bill" ? "bills" : "credits"; await updateEntry(effectiveUid, collectionName, editing.item.id, editing.item, values, reason); setEditing(null); }
  async function confirmDelete() {
    const collectionName = deleting.type === "bill" ? "bills" : "credits";
    setDeleteBusy(true);
    try {
      await deleteEntry(effectiveUid, collectionName, deleting.item.id, deleting.item, deleteReason);
      if (deleting.type === "bill") return router.push(customer ? `/customers/${customer.id}` : "/customers");
      setDeleting(null); setDeleteReason("");
    } finally { setDeleteBusy(false); }
  }
  const columns = [
    { key: "transaction", label: "Transaction", pinned: true, width: 190, render: (row) => row.type === "bill"
      ? <div className="entity-cell"><span className="person-icon compact"><ReceiptText size={16}/></span>Original bill</div>
      : <div className="entity-cell"><span className="transaction-icon"><Banknote size={15}/></span>Payment received</div> },
    { key: "date", label: "Date", width: 110, sortable: true, sortValue: (row) => row.date, render: (row) => formatDate(row.date) },
    { key: "note", label: "Note", render: (row) => row.type === "bill" ? row.item.description : (row.item.note || "-") },
    { key: "amount", label: "Amount", align: "right", width: 120, sortable: true, sortValue: (row) => Number(row.item.amount), render: (row) => row.type === "bill" ? formatCurrency(row.item.amount) : <span className="green">+ {formatCurrency(row.item.amount)}</span> },
    { key: "history", label: "History", width: 90, render: (row) => <button className="text-button" onClick={() => setHistory(row.type === "bill" ? { title: "Original bill", ids: [row.item.id], amountOnly: true } : { title: `Payment on ${formatDate(row.item.paidAt)}`, ids: [row.item.id] })}><History size={15}/> View</button> },
    { key: "actions", label: "Actions", align: "right", width: 90, hideable: false, render: (row) => row.type === "bill"
      ? <RowActions actions={[
        { label: "Edit", icon: <Edit3 size={15}/>, onClick: () => setEditing({ type: "bill", item: billWithId }) },
        { label: "Delete", icon: <Trash2 size={15}/>, variant: "danger", onClick: () => setDeleting({ type: "bill", item: billWithId }) },
      ]}/>
      : <RowActions actions={[
        { label: "Edit", icon: <Edit3 size={15}/>, onClick: () => setEditing({ type: "credit", item: row.item }) },
        { label: "Delete", icon: <Trash2 size={15}/>, variant: "danger", onClick: () => setDeleting({ type: "credit", item: row.item }) },
      ]}/> },
  ];
  if (!bill) return <AppShell title="Bill details" subtitle="Loading bill..."><div className="spinner" /></AppShell>;
  return <AppShell title={bill.description} subtitle={`${bill.billId || customer?.billId || "Bill"} - ${customer?.name || "Customer"} - ${formatDate(bill.billDate)}`} action={<Button icon={<Plus size={18}/>} onClick={() => setModal({ type: "credit" })}>Add payment</Button>}>
    <Link href={customer ? `/customers/${customer.id}` : "/customers"} className="back-link"><ArrowLeft size={16}/> Back to customer</Link>
    <section className="ledger-summary">
      <article><span>Bill amount</span><strong>{formatCurrency(bill.amount)}</strong></article>
      <article><span>Total paid</span><strong className="green">{formatCurrency(paid)}</strong></article>
      <article className="balance"><span>Balance left</span><strong>{formatCurrency(Number(bill.amount) - paid)}</strong></article>
    </section>
    <div className="status-strip"><span>Bill ID <strong>{bill.billId || customer?.billId || "-"}</strong></span><span>Status <Badge tone={bill.status || "pending"}/></span></div>
    <div className="section-heading"><div><h2>Transactions</h2><p>Payments and corrections recorded against this bill.</p></div><Button variant="secondary" icon={<Edit3 size={17}/>} onClick={() => setEditing({ type: "bill", item: billWithId })}>Correct bill</Button></div>
    <Table tableId="bill-transactions" columns={columns} rows={transactionRows} rowKey={(row) => row.item.id} emptyState={null}/>
    {!credits.length && <EmptyState icon={<Banknote/>} title="No payments yet" description="Record the first installment to start this bill’s transaction trail."/>}
    <Modal open={modal?.type === "credit"} onClose={() => setModal(null)} title="Record a payment" subtitle="Add a manual installment against this bill."><EntryForm type="credit" onSubmit={saveCredit}/></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={`Correct ${editing?.type || "entry"}`} subtitle="The original and corrected values will remain in history.">{editing && <EntryForm type={editing.type} initial={editing.item} showReason onSubmit={saveEdit}/>}</Modal>
    <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} busy={deleteBusy} title={`Delete ${deleting?.type || "entry"}`} subtitle="It will be removed from the ledger; the record and audit trail are kept." itemLabel={deleting?.type === "bill" ? "this bill" : "this payment"} reason={deleteReason} onReasonChange={setDeleteReason}/>
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
  const entries = audits.filter((audit) => entityIds.includes(audit.entityId) && (!amountOnly || audit.changes?.before?.amount !== undefined)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
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
