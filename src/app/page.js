"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading) router.replace(user ? "/dashboard" : "/login"); }, [loading, router, user]);
  return <main className="center-screen"><div className="spinner" /><p>Opening your ledger…</p></main>;
}
