"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfile } from "@/services/billingService";

const AuthContext = createContext(null);
const SUPER_ADMIN_EMAIL = "prashantbansal500@gmail.com";
const STORAGE_KEY = "billkaro:viewAs";

function readStoredViewAs() {
  try { const saved = sessionStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : null; } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAs] = useState(readStoredViewAs);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setLoading(false);
    if (nextUser) {
      ensureUserProfile(nextUser.uid, nextUser.email);
    } else {
      setViewAs(null);
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    }
  }), []);

  const startViewingAs = useCallback((uid, email) => {
    const next = { uid, email };
    setViewAs(next);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }, []);

  const stopViewingAs = useCallback(() => {
    setViewAs(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  }, []);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  const effectiveUid = isSuperAdmin && viewAs ? viewAs.uid : user?.uid;

  const value = useMemo(() => ({
    user, loading, isSuperAdmin,
    viewAs: isSuperAdmin ? viewAs : null,
    effectiveUid,
    startViewingAs, stopViewingAs,
  }), [user, loading, isSuperAdmin, viewAs, effectiveUid, startViewingAs, stopViewingAs]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
