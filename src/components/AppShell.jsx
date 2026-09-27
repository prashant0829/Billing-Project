"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { Database, LayoutDashboard, LogOut, Receipt, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { listUserProfiles } from "@/services/billingService";
import Button from "./ui/Button";
import ThemeToggle from "./ui/ThemeToggle";
import styles from "./AppShell.module.scss";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/bills", label: "Bills", icon: Receipt },
];
const adminLinks = [{ href: "/dev-tools", label: "Dev tools", icon: Database }];

export default function AppShell({ children, title, subtitle, action }) {
  const pathname = usePathname(); const router = useRouter();
  const { user, loading, isSuperAdmin, viewAs, startViewingAs, stopViewingAs } = useAuth();
  const dataLoading = useSelector((s) => !Object.values(s.data.loaded).every(Boolean));
  const [profiles, setProfiles] = useState([]);
  const [profilesError, setProfilesError] = useState("");
  useEffect(() => { if (isSuperAdmin) listUserProfiles().then(setProfiles).catch((err) => setProfilesError(err.message)); }, [isSuperAdmin]);
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  if (loading || !user || dataLoading) return <main className="center-screen"><div className="spinner" /></main>;
  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.wordmark}><span><ReceiptText size={20}/></span> Ledgerly</Link>
      <nav>{[...links, ...(isSuperAdmin ? adminLinks : [])].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname.startsWith(href) ? styles.active : ""}><Icon size={19}/>{label}</Link>)}</nav>
      <div className={styles.account}>
        <ThemeToggle/>
        <div className={styles.identity}>
          <div className={styles.avatar}>{user.email?.[0].toUpperCase()}</div>
          <div><strong>{user.email?.split("@")[0]}</strong><small>{user.email}</small></div>
        </div>
        <Button variant="secondary" size="sm" icon={<LogOut size={16}/>} onClick={() => signOut(auth)}>Sign out</Button>
      </div>
    </aside>
    <main className={styles.main}>
      {isSuperAdmin && <div className={`${styles.adminBar} ${viewAs ? styles.active : ""}`}>
        <ShieldCheck size={17}/>
        {viewAs ? <>
          <span>Viewing as <strong>{viewAs.email}</strong></span>
          <Button variant="secondary" size="sm" onClick={stopViewingAs}>Exit</Button>
        </> : profilesError ? <span>Couldn&rsquo;t load users: {profilesError}</span> : <>
          <span>Super admin</span>
          <select value="" onChange={(e) => { const profile = profiles.find((p) => p.uid === e.target.value); if (profile) startViewingAs(profile.uid, profile.email); }} aria-label="View a user's data">
            <option value="" disabled>{profiles.filter((p) => p.uid !== user.uid).length ? "View a user’s data…" : "No other users yet"}</option>
            {profiles.filter((p) => p.uid !== user.uid).map((p) => <option key={p.uid} value={p.uid}>{p.email}</option>)}
          </select>
        </>}
      </div>}
      <header><div><span className="eyebrow">Billing workspace</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>{children}
    </main>
  </div>;
}
