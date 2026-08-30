"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Banknote, Edit3, History, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import CustomerForm from "@/components/CustomerForm";
import EntryForm from "@/components/EntryForm";
import { useAuth } from "@/context/AuthContext";
import { addCredit, createBill, getLedger, listCustomers, updateCustomer, updateEntry } from "@/services/billingService";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

export default function CustomerDetail() {
  const { id } = useParams(); const { user } = useAuth();
  const [customer, setCustomer] = useState(null); const [ledger, setLedger] = useState({ bills: [], credits: [], audits: [] });
  const [modal, setModal] = useState(null); const [editing, setEditing] = useState(null); const [history, setHistory] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const load = useCallback(async () => { if (!user) return; const [people, all] = await Promise.all([listCustomers(user.uid), getLedger(user.uid)]); setCustomer(people.find((p) => p.id === id)); setLedger(all); }, [id, user]);
  useEffect(() => { if (user) Promise.all([listCustomers(user.uid), getLedger(user.uid)]).then(([people, all]) => { setCustomer(people.find((p) => p.id === id)); setLedger(all); }); }, [id, user]);
  const bills = useMemo(() => ledger.bills.filter((b) => b.customerId === id).sort((a, b) => entryTime(b.createdAt) - entryTime(a.createdAt)), [id, ledger.bills]);
  const visibleBills = useMemo(() => bills.filter((bill) => statusFilter === "all" || (bill.status || "pending") === statusFilter), [bills, statusFilter]);
  const billIds = useMemo(() => bills.map((b) => b.id), [bills]);
  const credits = useMemo(() => ledger.credits.filter((c) => billIds.includes(c.billId)).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt))), [billIds, ledger.credits]);
  const total = bills.reduce((s, b) => s + Number(b.amount), 0); const paid = credits.reduce((s, c) => s + Number(c.amount), 0);
  async function saveBill(values) { await createBill(user.uid, id, values); setModal(null); await load(); }
  async function saveCredit(values) { await addCredit(user.uid, modal.billId, values); setModal(null); await load(); }
  async function saveCustomer(values, reason) { await updateCustomer(user.uid, id, customer, values, reason); setModal(null); await load(); }
  async function saveEdit(values, reason) { const collectionName = editing.type === "bill" ? "bills" : "credits"; await updateEntry(user.uid, collectionName, editing.item.id, editing.item, values, reason); setEditing(null); await load(); }
  if (!customer) return <AppShell title="Customer ledger" subtitle="Loading customer..."><div className="spinner" /></AppShell>;
  return <AppShell title={customer.name} subtitle={customer.primaryContact} action={<button className="button secondary" onClick={() => setModal({ type: "customer" })}><Edit3 size={17}/> Edit details</button>}>
    <Link href="/customers" className="back-link"><ArrowLeft size={16}/> All customers</Link>
    <section className="ledger-summary"><article><span>Total billed</span><strong>{formatCurrency(total)}</strong></article><article><span>Total paid</span><strong className="green">{formatCurrency(paid)}</strong></article><article className="balance"><span>Balance left</span><strong>{formatCurrency(total - paid)}</strong></article></section>
    <div className="section-heading"><div><h2>Bills & installments</h2><p>Add payments against a specific bill and follow its timeline.</p></div><div className="section-actions"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter bills by status"><option value="all">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select><button className="button primary" onClick={() => setModal({ type: "bill" })}><Plus size={18}/> Add bill</button></div></div>
    <section className="table-card">
      <table className="data-table">
        <thead><tr><th>Bill ID</th><th>Bill</th><th>Date</th><th>Status</th><th>Installments</th><th className="amount-cell">Billed</th><th className="amount-cell">Paid</th><th className="amount-cell">Left</th><th>History</th><th>Actions</th></tr></thead>
        <tbody>{visibleBills.map((bill) => {
      const billCredits = credits.filter((c) => c.billId === bill.id); const billPaid = billCredits.reduce((s, c) => s + Number(c.amount), 0);
      const left = Number(bill.amount) - billPaid; const billWithId = { ...bill, billId: bill.billId || customer.billId || "" };
      return <tr key={bill.id}>
        <td><span className="table-code">{billWithId.billId || "-"}</span></td>
        <td><div className="entity-cell"><span className="person-icon compact"><ReceiptText size={18}/></span><strong>{bill.description}</strong></div></td>
        <td>{formatDate(bill.billDate)}</td>
        <td><span className={`badge ${bill.status === "paid" ? "paid" : "pending"}`}>{bill.status || "pending"}</span></td>
        <td>{billCredits.length}</td>
        <td className="amount-cell"><strong>{formatCurrency(bill.amount)}</strong></td>
        <td className="amount-cell green">{formatCurrency(billPaid)}</td>
        <td className="amount-cell">{formatCurrency(left)}</td>
        <td><button className="text-button" onClick={() => setHistory({ title: bill.description, ids: [bill.id], amountOnly: true })}><History size={15}/> View</button></td>
        <td className="action-cell wide"><button className="icon-link" onClick={() => setEditing({ type: "bill", item: billWithId })} aria-label={`Edit ${bill.description}`}><Edit3 size={16}/></button><Link href={`/bills/${bill.id}`} className="icon-link" aria-label={`Open ${bill.description}`}><ArrowUpRight size={17}/></Link></td>
      </tr>;
    })}</tbody>
      </table>
    </section>
    {!visibleBills.length && <div className="card empty-card"><div className="empty-icon"><ReceiptText/></div><h2>No bills found</h2><p>Add a bill or change the status filter.</p></div>}
    <Modal open={modal?.type === "bill"} onClose={() => setModal(null)} title="Add a bill" subtitle={`Create a new bill for ${customer.name}.`}><EntryForm type="bill" onSubmit={saveBill}/></Modal>
    <Modal open={modal?.type === "credit"} onClose={() => setModal(null)} title="Record a payment" subtitle="Add a manual installment against this bill."><EntryForm type="credit" onSubmit={saveCredit}/></Modal>
    <Modal open={modal?.type === "customer"} onClose={() => setModal(null)} title="Correct customer details" subtitle="Every edit requires a reason and is recorded."><CustomerForm initial={customer} requireReason submitLabel="Save correction" onSubmit={saveCustomer}/></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={`Correct ${editing?.type || "entry"}`} subtitle="The original and corrected values will remain in history.">{editing && <EntryForm type={editing.type} initial={editing.item} requireReason onSubmit={saveEdit}/>}</Modal>
    <HistoryDrawer open={!!history} onClose={() => setHistory(null)} title={history?.title} audits={ledger.audits} entityIds={history?.ids || []} amountOnly={history?.amountOnly}/>
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
  const entries = audits.filter((a) => entityIds.includes(a.entityId) && (!amountOnly || a.changes?.before?.amount !== undefined)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
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
