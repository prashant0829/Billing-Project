"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ArrowUpRight, Edit3, Plus, ReceiptText, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import EntryForm from "@/components/EntryForm";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import RowActions from "@/components/ui/RowActions";
import Table from "@/components/ui/Table";
import { useAuth } from "@/context/AuthContext";
import { createBill, deleteEntry, updateEntry } from "@/services/billingService";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function BillsPage() {
  const { effectiveUid } = useAuth();
  const { customers, bills: allBills, credits: allCredits } = useSelector((s) => s.data);
  const [modal, setModal] = useState(null); const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null); const [deleteReason, setDeleteReason] = useState(""); const [deleteBusy, setDeleteBusy] = useState(false);
  const customersById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const rows = useMemo(() => allBills.map((bill) => {
    const billCredits = allCredits.filter((c) => c.billId === bill.id);
    const billPaid = billCredits.reduce((s, c) => s + Number(c.amount), 0);
    return { bill, customer: customersById[bill.customerId], paid: billPaid, left: Number(bill.amount) - billPaid };
  }), [allBills, allCredits, customersById]);
  async function saveBill(values) { await createBill(effectiveUid, values.customerId, values); setModal(null); }
  async function saveEdit(values, reason) { await updateEntry(effectiveUid, "bills", editing.id, editing, values, reason); setEditing(null); }
  async function confirmDelete() {
    setDeleteBusy(true);
    try { await deleteEntry(effectiveUid, "bills", deleting.id, deleting, deleteReason); setDeleting(null); setDeleteReason(""); } finally { setDeleteBusy(false); }
  }
  const columns = [
    { key: "billId", label: "Bill ID", pinned: true, width: 130, sortable: true, filterable: true, filterValue: ({ bill, customer }) => bill.billId || customer?.billId || "", sortValue: ({ bill, customer }) => bill.billId || customer?.billId || "", render: ({ bill, customer }) => <span className="table-code">{bill.billId || customer?.billId || "-"}</span> },
    { key: "customer", label: "Customer", pinned: true, width: 160, sortable: true, filterable: true, filterType: "select", filterOptions: customers.map((c) => ({ value: c.id, label: c.name })), filterValue: ({ customer }) => customer?.id || "", sortValue: ({ customer }) => customer?.name || "", render: ({ customer }) => customer ? <Link href={`/customers/${customer.id}`} className="inline-link">{customer.name}</Link> : "-" },
    { key: "date", label: "Date", width: 110, sortable: true, sortValue: ({ bill }) => bill.billDate, render: ({ bill }) => formatDate(bill.billDate) },
    { key: "status", label: "Status", width: 100, sortable: true, filterable: true, filterType: "select", filterOptions: [{ value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }, { value: "cancelled", label: "Cancelled" }], filterValue: ({ bill }) => bill.status || "pending", sortValue: ({ bill }) => bill.status || "pending", render: ({ bill }) => <Badge tone={bill.status || "pending"}/> },
    { key: "billed", label: "Billed", align: "right", width: 110, sortable: true, sortValue: ({ bill }) => Number(bill.amount), render: ({ bill }) => formatCurrency(bill.amount) },
    { key: "paid", label: "Paid", align: "right", width: 110, sortable: true, sortValue: ({ paid }) => paid, render: ({ paid }) => <span className="green">{formatCurrency(paid)}</span> },
    { key: "left", label: "Left", align: "right", width: 110, sortable: true, sortValue: ({ left }) => left, render: ({ left }) => formatCurrency(left) },
    { key: "actions", label: "Actions", align: "right", width: 130, hideable: false, render: ({ bill }) => <RowActions actions={[
      { label: "Edit", icon: <Edit3 size={15}/>, onClick: () => setEditing(bill) },
      { label: "Delete", icon: <Trash2 size={15}/>, variant: "danger", onClick: () => setDeleting(bill) },
      { label: "Open", icon: <ArrowUpRight size={15}/>, href: `/bills/${bill.id}` },
    ]}/> },
  ];
  return <AppShell title="Bills" subtitle="Every bill across every customer, in one ledger." action={<Button icon={<Plus size={18}/>} onClick={() => setModal({ type: "add" })}>Add bill</Button>}>
    <Table tableId="bills" columns={columns} rows={rows} rowKey={({ bill }) => bill.id} emptyState={<EmptyState card={false} icon={<ReceiptText/>} title="No bills found" description="Add a bill or change the search and status filter."/>}/>
    <Modal open={modal?.type === "add"} onClose={() => setModal(null)} title="Add a bill" subtitle="Pick a customer and record a new bill for them."><EntryForm type="bill" customers={customers} onSubmit={saveBill}/></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title="Correct bill" subtitle="The original and corrected values will remain in history.">{editing && <EntryForm type="bill" initial={{ ...editing, billId: editing.billId || customersById[editing.customerId]?.billId || "" }} customers={customers} showReason onSubmit={saveEdit}/>}</Modal>
    <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} busy={deleteBusy} title="Delete bill" subtitle="It will be removed from the ledger; the record and audit trail are kept." itemLabel="this bill" reason={deleteReason} onReasonChange={setDeleteReason}/>
  </AppShell>;
}
