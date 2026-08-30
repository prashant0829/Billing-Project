"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote, Edit3, History, Plus, ReceiptText } from "lucide-react";
import AppShell from "@/components/AppShell";
import EntryForm from "@/components/EntryForm";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { addCredit, getLedger, listCustomers, updateEntry } from "@/services/billingService";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

export default function BillDetail() {
  const { id } = useParams(); const { user } = useAuth();
  const [data, setData] = useState({ customers: [], bills: [], credits: [], audits: [] });
  const [modal, setModal] = useState(null); const [editing, setEditing] = useState(null); const [history, setHistory] = useState(null);
  const load = useCallback(async () => { if (!user) return; const [customers, ledger] = await Promise.all([listCustomers(user.uid), getLedger(user.uid)]); setData({ customers, ...ledger }); }, [user]);
  useEffect(() => { if (user) Promise.all([listCustomers(user.uid), getLedger(user.uid)]).then(([customers, ledger]) => setData({ customers, ...ledger })); }, [user]);
  const bill = useMemo(() => data.bills.find((item) => item.id === id), [data.bills, id]);
  const customer = useMemo(() => data.customers.find((item) => item.id === bill?.customerId), [bill, data.customers]);
  const credits = useMemo(() => data.credits.filter((item) => item.billId === id).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt))), [data.credits, id]);
  const transactionRows = useMemo(() => {
    if (!bill) return [];
    return [
      { type: "bill", item: bill, date: bill.billDate },
      ...credits.map((credit) => ({ type: "credit", item: credit, date: credit.paidAt })),
    ].sort((a, b) => entryTime(b.item.createdAt) - entryTime(a.item.createdAt));
  }, [bill, credits]);
  const paid = credits.reduce((sum, item) => sum + Number(item.amount), 0);
  const billWithId = useMemo(() => bill ? { ...bill, billId: bill.billId || customer?.billId || "" } : null, [bill, customer]);
  async function saveCredit(values) { await addCredit(user.uid, id, values); setModal(null); await load(); }
  async function saveEdit(values, reason) { const collectionName = editing.type === "bill" ? "bills" : "credits"; await updateEntry(user.uid, collectionName, editing.item.id, editing.item, values, reason); setEditing(null); await load(); }
  if (!bill) return <AppShell title="Bill details" subtitle="Loading bill..."><div className="spinner" /></AppShell>;
  return <AppShell title={bill.description} subtitle={`${bill.billId || customer?.billId || "Bill"} - ${customer?.name || "Customer"} - ${formatDate(bill.billDate)}`} action={<button className="button primary" onClick={() => setModal({ type: "credit" })}><Plus size={18}/> Add payment</button>}>
    <Link href={customer ? `/customers/${customer.id}` : "/customers"} className="back-link"><ArrowLeft size={16}/> Back to customer</Link>
    <section className="ledger-summary">
      <article><span>Bill amount</span><strong>{formatCurrency(bill.amount)}</strong></article>
      <article><span>Total paid</span><strong className="green">{formatCurrency(paid)}</strong></article>
      <article className="balance"><span>Balance left</span><strong>{formatCurrency(Number(bill.amount) - paid)}</strong></article>
    </section>
    <div className="status-strip"><span>Bill ID <strong>{bill.billId || customer?.billId || "-"}</strong></span><span>Status <b className={`badge ${bill.status === "paid" ? "paid" : "pending"}`}>{bill.status || "pending"}</b></span></div>
    <div className="section-heading"><div><h2>Transactions</h2><p>Payments and corrections recorded against this bill.</p></div><button className="button secondary" onClick={() => setEditing({ type: "bill", item: billWithId })}><Edit3 size={17}/> Correct bill</button></div>
    <section className="table-card">
      <table className="data-table">
        <thead><tr><th>Transaction</th><th>Date</th><th>Note</th><th className="amount-cell">Amount</th><th>History</th><th></th></tr></thead>
        <tbody>{transactionRows.map((row) => row.type === "bill" ? <tr key={row.item.id}>
          <td><div className="entity-cell"><span className="person-icon compact"><ReceiptText size={18}/></span><strong>Original bill</strong></div></td>
          <td>{formatDate(row.item.billDate)}</td>
          <td>{row.item.description}</td>
          <td className="amount-cell"><strong>{formatCurrency(row.item.amount)}</strong></td>
          <td><button className="text-button" onClick={() => setHistory({ title: "Original bill", ids: [row.item.id], amountOnly: true })}><History size={15}/> View</button></td>
          <td className="action-cell"><button className="icon-link" onClick={() => setEditing({ type: "bill", item: billWithId })} aria-label="Correct bill"><Edit3 size={16}/></button></td>
        </tr> : <tr key={row.item.id}>
          <td><div className="entity-cell"><span className="transaction-icon"><Banknote size={17}/></span><strong>Payment received</strong></div></td>
          <td>{formatDate(row.item.paidAt)}</td>
          <td>{row.item.note || "-"}</td>
          <td className="amount-cell green"><strong>+ {formatCurrency(row.item.amount)}</strong></td>
          <td><button className="text-button" onClick={() => setHistory({ title: `Payment on ${formatDate(row.item.paidAt)}`, ids: [row.item.id] })}><History size={15}/> View</button></td>
          <td className="action-cell"><button className="icon-link" onClick={() => setEditing({ type: "credit", item: row.item })} aria-label="Correct payment"><Edit3 size={16}/></button></td>
        </tr>)}</tbody>
      </table>
    </section>
    {!credits.length && <div className="card empty-card table-empty"><div className="empty-icon"><Banknote/></div><h2>No payments yet</h2><p>Record the first installment to start this bill’s transaction trail.</p></div>}
    <Modal open={modal?.type === "credit"} onClose={() => setModal(null)} title="Record a payment" subtitle="Add a manual installment against this bill."><EntryForm type="credit" onSubmit={saveCredit}/></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={`Correct ${editing?.type || "entry"}`} subtitle="The original and corrected values will remain in history.">{editing && <EntryForm type={editing.type} initial={editing.item} requireReason onSubmit={saveEdit}/>}</Modal>
    <HistoryDrawer open={!!history} onClose={() => setHistory(null)} title={history?.title} audits={data.audits} entityIds={history?.ids || []} amountOnly={history?.amountOnly}/>
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
      <div className="drawer-head"><div><span className="eyebrow">History</span><h2>{title || "Correction history"}</h2></div><button className="icon-link" onClick={onClose} aria-label="Close history">X</button></div>
      <AuditHistory audits={audits} entityIds={entityIds} amountOnly={amountOnly}/>
    </section>
  </aside>;
}

function AuditHistory({ audits, entityIds, amountOnly = false }) {
  const entries = audits.filter((audit) => entityIds.includes(audit.entityId) && (!amountOnly || audit.changes?.before?.amount !== undefined)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  if (!entries.length) return <div className="empty-card"><div className="empty-icon"><History/></div><h3>No corrections made</h3><p>Any future edits and their reasons will appear here.</p></div>;
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
