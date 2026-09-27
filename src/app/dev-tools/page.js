"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Trash2, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Table from "@/components/ui/Table";
import { useAuth } from "@/context/AuthContext";
import { clearTestData, deleteUsersCascade, listUserProfiles, seedTestData } from "@/services/billingService";

export default function DevToolsPage() {
  const { user, effectiveUid, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(null); const [bulkBusy, setBulkBusy] = useState(false);

  const loadProfiles = useCallback(() => { listUserProfiles().then((all) => setProfiles(all.filter((p) => p.uid !== user?.uid))); }, [user]);
  useEffect(() => { if (isSuperAdmin) loadProfiles(); }, [isSuperAdmin, loadProfiles]);

  useEffect(() => { if (!loading && !isSuperAdmin) router.replace("/dashboard"); }, [loading, isSuperAdmin, router]);
  if (!isSuperAdmin) return <AppShell title="Dev tools" subtitle="Loading..."><div className="spinner" /></AppShell>;

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

  async function confirmBulkDeleteUsers() {
    setBulkBusy(true);
    try {
      await deleteUsersCascade(bulkDeleting.map((p) => p.uid));
      setBulkDeleting(null);
      loadProfiles();
    } finally { setBulkBusy(false); }
  }

  const userColumns = [
    { key: "email", label: "Email", pinned: true, width: 260, sortable: true, filterable: true, filterValue: (p) => p.email, sortValue: (p) => p.email, render: (p) => p.email },
    { key: "uid", label: "User ID", render: (p) => <span className="table-code">{p.uid}</span> },
  ];

  return <AppShell title="Dev tools" subtitle="Generate or clear dummy data, and manage user accounts.">
    <section className="card dev-panel">
      <h2>Seed test data</h2>
      <p>Creates 2 test customers and 200 randomized bills — with partial payments on roughly half of them — in your currently signed-in account. Every seeded record is tagged so it can be cleanly removed later.</p>
      <div className="dev-actions">
        <Button icon={<Database size={17}/>} busy={seeding} busyLabel="Generating…" onClick={handleSeed}>Generate 200 test bills</Button>
        <Button variant="danger" icon={<Trash2 size={17}/>} busy={clearing} busyLabel="Clearing…" onClick={handleClear}>Clear test data</Button>
      </div>
      {message && <p className="dev-message">{message}</p>}
    </section>
    <div className="section-heading"><div><h2>Manage users</h2><p>Permanently delete a user&rsquo;s data — every customer, bill, payment, and audit entry in their account. Their login still works afterward; signing back in just gives them a fresh, empty account.</p></div></div>
    <Table
      tableId="admin-users" columns={userColumns} rows={profiles} rowKey={(p) => p.uid}
      selectable
      bulkActions={(selected) => <Button variant="danger" size="sm" icon={<Trash2 size={14}/>} onClick={() => setBulkDeleting(selected)}>Delete {selected.length} selected</Button>}
      emptyState={<EmptyState card={false} icon={<Users/>} title="No other users yet" description="Other accounts will show up here once they sign in."/>}
    />
    <ConfirmDialog
      open={!!bulkDeleting} onCancel={() => setBulkDeleting(null)} onConfirm={confirmBulkDeleteUsers} busy={bulkBusy}
      title="Delete user accounts" subtitle="This permanently deletes all customers, bills, payments, and audit history for the selected accounts. It cannot be undone. Their login will still work — they'll just start over with an empty account."
      itemLabel={bulkDeleting ? `${bulkDeleting.length === 1 ? "this" : "these"} ${bulkDeleting.length} user account${bulkDeleting.length === 1 ? "" : "s"}` : ""}
      showReason={false}
    />
  </AppShell>;
}
