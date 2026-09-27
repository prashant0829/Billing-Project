"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ArrowRight, IndianRupee, Receipt, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import Button from "@/components/ui/Button";
import StatTile from "@/components/ui/StatTile";
import { formatCurrency } from "@/lib/formatters";

export default function Dashboard() {
  const { customers, bills, credits } = useSelector((s) => s.data);
  const totals = useMemo(() => {
    const billed = bills.reduce((sum, item) => sum + Number(item.amount), 0);
    const paid = credits.reduce((sum, item) => sum + Number(item.amount), 0);
    return { billed, paid, pending: billed - paid };
  }, [bills, credits]);
  return <AppShell title="Good to see you." subtitle="Here’s the financial pulse of your billing ledger." action={<Button href="/customers">Add a customer</Button>}>
    <section className="stats-grid">
      <StatTile featured icon={<IndianRupee/>} label="Total pending" value={formatCurrency(totals.pending)} hint="Across all active bills"/>
      <StatTile icon={<Receipt/>} label="Total billed" value={formatCurrency(totals.billed)} hint={`${bills.length} bill entries`}/>
      <StatTile icon={<IndianRupee/>} label="Total received" value={formatCurrency(totals.paid)} hint={`${credits.length} payment entries`}/>
      <StatTile icon={<Users/>} label="Customers" value={customers.length} hint="People in your ledger"/>
    </section>
    <section className="card empty-card"><div className="empty-icon"><Receipt/></div><h2>Your ledger at a glance</h2><p>Open customers to add bills, record installments, and inspect a complete correction trail.</p><Link href="/customers" className="inline-link">Manage customers <ArrowRight size={17}/></Link></section>
  </AppShell>;
}
