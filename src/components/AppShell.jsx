"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, ReceiptText, Users } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import styles from "./AppShell.module.scss";

const links = [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/customers", label: "Customers", icon: Users }];

export default function AppShell({ children, title, subtitle, action }) {
  const pathname = usePathname(); const router = useRouter(); const { user, loading } = useAuth();
  if (!loading && !user) { router.replace("/login"); return null; }
  if (loading) return <main className="center-screen"><div className="spinner" /></main>;
  return <div className={styles.shell}>
    <aside className={styles.sidebar}><Link href="/dashboard" className={styles.wordmark}><span><ReceiptText size={20}/></span> Ledgerly</Link>
      <nav>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname.startsWith(href) ? styles.active : ""}><Icon size={19}/>{label}</Link>)}</nav>
      <div className={styles.account}><div className={styles.avatar}>{user.email?.[0].toUpperCase()}</div><div><strong>{user.email?.split("@")[0]}</strong><small>{user.email}</small></div><button aria-label="Sign out" onClick={() => signOut(auth)}><LogOut size={18}/></button></div>
    </aside>
    <main className={styles.main}><header><div><span className="eyebrow">BILLING WORKSPACE</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>{children}</main>
  </div>;
}
