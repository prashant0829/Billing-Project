"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Edit3, Plus, Search, UserRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import CustomerForm from "@/components/CustomerForm";
import { useAuth } from "@/context/AuthContext";
import { createCustomer, getLedger, listCustomers, updateCustomer } from "@/services/billingService";
import { formatCurrency } from "@/lib/formatters";

export default function CustomersPage() {
  const { user } = useAuth(); const [customers, setCustomers] = useState([]); const [ledger, setLedger] = useState({ bills: [], credits: [] });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null); const [search, setSearch] = useState("");
  const load = useCallback(async () => { if (!user) return; const [people, entries] = await Promise.all([listCustomers(user.uid), getLedger(user.uid)]); setCustomers(people); setLedger(entries); }, [user]);
  useEffect(() => { if (user) Promise.all([listCustomers(user.uid), getLedger(user.uid)]).then(([people, entries]) => { setCustomers(people); setLedger(entries); }); }, [user]);
  const filtered = customers.filter((c) => `${c.name} ${c.primaryContact}`.toLowerCase().includes(search.toLowerCase()));
  const billCount = useMemo(() => (customerId) => ledger.bills.filter((b) => b.customerId === customerId).length, [ledger.bills]);
  const balance = useMemo(() => (customerId) => {
    const ids = ledger.bills.filter((b) => b.customerId === customerId).map((b) => b.id);
    return ledger.bills.filter((b) => b.customerId === customerId).reduce((s, b) => s + Number(b.amount), 0) - ledger.credits.filter((c) => ids.includes(c.billId)).reduce((s, c) => s + Number(c.amount), 0);
  }, [ledger]);
  async function add(values) { await createCustomer(user.uid, values); setOpen(false); await load(); }
  async function saveCustomer(values, reason) { await updateCustomer(user.uid, editing.id, editing, values, reason); setEditing(null); await load(); }
  return <AppShell title="Customers" subtitle="Every person, bill, and payment in one clear place." action={<button className="button primary" onClick={() => setOpen(true)}><Plus size={18}/> Add customer</button>}>
    <div className="toolbar"><div className="search"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or contact" /></div><span>{filtered.length} customers</span></div>
    <section className="table-card">
      <table className="data-table">
        <thead><tr><th>Customer</th><th>Contact</th><th>Bills</th><th>Status</th><th className="amount-cell">Balance</th><th>Actions</th></tr></thead>
        <tbody>{filtered.map((customer) => {
          const currentBalance = balance(customer.id);
          return <tr key={customer.id}>
            <td><div className="entity-cell"><span className="person-icon compact"><UserRound size={18}/></span><strong>{customer.name}</strong></div></td>
            <td>{customer.primaryContact}</td>
            <td>{billCount(customer.id)}</td>
            <td><span className={currentBalance > 0 ? "badge pending" : "badge paid"}>{currentBalance > 0 ? "Pending" : "Settled"}</span></td>
            <td className="amount-cell"><strong>{formatCurrency(currentBalance)}</strong></td>
            <td className="action-cell wide"><button className="icon-link" onClick={() => setEditing(customer)} aria-label={`Edit ${customer.name}`}><Edit3 size={16}/></button><Link href={`/customers/${customer.id}`} className="icon-link" aria-label={`Open ${customer.name}`}><ArrowUpRight size={17}/></Link></td>
          </tr>;
        })}</tbody>
      </table>
    </section>
    {!filtered.length && <div className="card empty-card"><div className="empty-icon"><UserRound/></div><h2>No customers found</h2><p>Add your first customer to begin a billing ledger.</p></div>}
    <Modal open={open} onClose={() => setOpen(false)} title="Add a customer" subtitle="The first three fields are mandatory."><CustomerForm onSubmit={add}/></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title="Correct customer details" subtitle="Every edit requires a reason and is recorded.">{editing && <CustomerForm initial={editing} requireReason submitLabel="Save correction" onSubmit={saveCustomer}/>}</Modal>
  </AppShell>;
}
