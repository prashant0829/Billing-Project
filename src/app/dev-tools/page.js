"use client";

import { useState } from "react";
import { Database, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { clearTestData, seedTestData } from "@/services/billingService";

export default function DevToolsPage() {
  const { effectiveUid } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSeed() {
    setSeeding(true); setMessage("");
    try {
      const { customerCount, billCount } = await seedTestData(effectiveUid, { customerCount: 2, billCount: 200 });
      setMessage(`Created ${customerCount} test customers and ${billCount} test bills (with random payments on about half).`);
    } catch (err) { setMessage(`Failed: ${err.message}`); } finally { setSeeding(false); }
  }

  async function handleClear() {
    setClearing(true); setMessage("");
    try {
      const { customerCount, billCount, creditCount } = await clearTestData(effectiveUid);
      setMessage(`Removed ${customerCount} test customers, ${billCount} test bills, and ${creditCount} test payments.`);
    } catch (err) { setMessage(`Failed: ${err.message}`); } finally { setClearing(false); }
  }

  return <AppShell title="Dev tools" subtitle="Generate or clear dummy data to test tables, pagination, and sorting.">
    <section className="card dev-panel">
      <h2>Seed test data</h2>
      <p>Creates 2 test customers and 200 randomized bills — with partial payments on roughly half of them — in your currently signed-in account. Every seeded record is tagged so it can be cleanly removed later.</p>
      <div className="dev-actions">
        <Button icon={<Database size={17}/>} busy={seeding} busyLabel="Generating…" onClick={handleSeed}>Generate 200 test bills</Button>
        <Button variant="danger" icon={<Trash2 size={17}/>} busy={clearing} busyLabel="Clearing…" onClick={handleClear}>Clear test data</Button>
      </div>
      {message && <p className="dev-message">{message}</p>}
    </section>
  </AppShell>;
}
