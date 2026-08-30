"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, IndianRupee, Receipt, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { getLedger, listCustomers } from "@/services/billingService";
import { formatCurrency } from "@/lib/formatters";

export default function Dashboard() {
  const { user } = useAuth(); const [data, setData] = useState({ customers: [], bills: [], credits: [] });
  useEffect(() => { if (user) Promise.all([listCustomers(user.uid), getLedger(user.uid)]).then(([customers, ledger]) => setData({ customers, ...ledger })); }, [user]);
  const totals = useMemo(() => {
    const billed = data.bills.reduce((sum, item) => sum + Number(item.amount), 0);
    const paid = data.credits.reduce((sum, item) => sum + Number(item.amount), 0);
    return { billed, paid, pending: billed - paid };
  }, [data]);
  return <AppShell title="Good to see you." subtitle="Here’s the financial pulse of your billing ledger." action={<Link href="/customers" className="button primary">Add a customer</Link>}>
    <section className="stats-grid">
      <article className="stat featured"><div className="stat-icon"><IndianRupee/></div><span>Total pending</span><strong>{formatCurrency(totals.pending)}</strong><small>Across all active bills</small></article>
      <article className="stat"><div className="stat-icon"><Receipt/></div><span>Total billed</span><strong>{formatCurrency(totals.billed)}</strong><small>{data.bills.length} bill entries</small></article>
      <article className="stat"><div className="stat-icon"><IndianRupee/></div><span>Total received</span><strong>{formatCurrency(totals.paid)}</strong><small>{data.credits.length} payment entries</small></article>
      <article className="stat"><div className="stat-icon"><Users/></div><span>Customers</span><strong>{data.customers.length}</strong><small>People in your ledger</small></article>
    </section>
    <section className="card empty-card"><div className="empty-icon"><Receipt/></div><h2>Your ledger at a glance</h2><p>Open customers to add bills, record installments, and inspect a complete correction trail.</p><Link href="/customers" className="inline-link">Manage customers <ArrowRight size={17}/></Link></section>
  </AppShell>;
}
