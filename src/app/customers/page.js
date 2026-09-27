"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { ArrowUpRight, Edit3, Plus, Trash2, UserRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import CustomerForm from "@/components/CustomerForm";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import RowActions from "@/components/ui/RowActions";
import Table from "@/components/ui/Table";
import { useAuth } from "@/context/AuthContext";
import { createCustomer, deleteCustomersCascade, updateCustomer } from "@/services/billingService";
import { formatCurrency } from "@/lib/formatters";

export default function CustomersPage() {
  const { effectiveUid } = useAuth();
  const { customers, bills, credits } = useSelector((s) => s.data);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(null); const [bulkReason, setBulkReason] = useState(""); const [bulkBusy, setBulkBusy] = useState(false);
  const billCount = useMemo(() => (customerId) => bills.filter((b) => b.customerId === customerId).length, [bills]);
  const balance = useMemo(() => (customerId) => {
    const ids = bills.filter((b) => b.customerId === customerId).map((b) => b.id);
    return bills.filter((b) => b.customerId === customerId).reduce((s, b) => s + Number(b.amount), 0) - credits.filter((c) => ids.includes(c.billId)).reduce((s, c) => s + Number(c.amount), 0);
  }, [bills, credits]);
  async function add(values) { await createCustomer(effectiveUid, values); setOpen(false); }
  async function saveCustomer(values, reason) { await updateCustomer(effectiveUid, editing.id, editing, values, reason); setEditing(null); }
  async function confirmBulkDelete() {
    setBulkBusy(true);
    try { await deleteCustomersCascade(effectiveUid, bulkDeleting, bulkReason); setBulkDeleting(null); setBulkReason(""); } finally { setBulkBusy(false); }
  }
  const columns = [
    { key: "name", label: "Customer", pinned: true, width: 190, sortable: true, filterable: true, filterValue: (c) => c.name, sortValue: (c) => c.name, render: (c) => <div className="entity-cell"><span className="person-icon compact"><UserRound size={16}/></span>{c.name}</div> },
    { key: "contact", label: "Contact", width: 150, sortable: true, filterable: true, filterValue: (c) => c.primaryContact, sortValue: (c) => c.primaryContact, render: (c) => c.primaryContact },
    { key: "bills", label: "Bills", align: "right", width: 90, sortable: true, sortValue: (c) => billCount(c.id), render: (c) => billCount(c.id) },
    { key: "status", label: "Status", width: 110, sortable: true, sortValue: (c) => balance(c.id) > 0 ? 1 : 0, render: (c) => <Badge tone={balance(c.id) > 0 ? "pending" : "paid"}>{balance(c.id) > 0 ? "Pending" : "Settled"}</Badge> },
    { key: "balance", label: "Balance", align: "right", width: 120, sortable: true, sortValue: (c) => balance(c.id), render: (c) => formatCurrency(balance(c.id)) },
    { key: "actions", label: "Actions", align: "right", width: 90, hideable: false, render: (c) => <RowActions actions={[
      { label: "Edit", icon: <Edit3 size={15}/>, onClick: () => setEditing(c) },
      { label: "Open", icon: <ArrowUpRight size={15}/>, href: `/customers/${c.id}` },
    ]}/> },
  ];
  return <AppShell title="Customers" subtitle="Every person, bill, and payment in one clear place." action={<Button icon={<Plus size={18}/>} onClick={() => setOpen(true)}>Add customer</Button>}>
    <Table
      tableId="customers" columns={columns} rows={customers} rowKey={(c) => c.id}
      selectable
      bulkActions={(selected) => <Button variant="danger" size="sm" icon={<Trash2 size={14}/>} onClick={() => setBulkDeleting(selected)}>Delete {selected.length} selected</Button>}
      emptyState={<EmptyState card={false} icon={<UserRound/>} title="No customers found" description="Add your first customer to begin a billing ledger."/>}
    />
    <Modal open={open} onClose={() => setOpen(false)} title="Add a customer" subtitle="The first three fields are mandatory."><CustomerForm onSubmit={add}/></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title="Correct customer details" subtitle="Every edit is recorded; a reason is optional.">{editing && <CustomerForm initial={editing} showReason submitLabel="Save correction" onSubmit={saveCustomer}/>}</Modal>
    <ConfirmDialog
      open={!!bulkDeleting} onCancel={() => setBulkDeleting(null)} onConfirm={confirmBulkDelete} busy={bulkBusy}
      title="Delete customers" subtitle="This is permanent — it removes the selected customers along with every bill and payment recorded against them. It cannot be undone."
      itemLabel={bulkDeleting ? `${bulkDeleting.length === 1 ? "this" : "these"} ${bulkDeleting.length} customer${bulkDeleting.length === 1 ? "" : "s"} (and all their bills and payments)` : ""}
      reason={bulkReason} onReasonChange={setBulkReason}
    />
  </AppShell>;
}
