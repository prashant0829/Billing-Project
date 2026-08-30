"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import styles from "./login.module.scss";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const action =
        mode === "login"
          ? signInWithEmailAndPassword
          : createUserWithEmailAndPassword;
      await action(auth, form.email, form.password);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err.code?.replace("auth/", "").replaceAll("-", " ") ||
          "Unable to continue.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.brand}>
        <div className={styles.logo}>L</div>
        <h1>
          Know what’s paid.
          <br />
          Know what’s pending.
        </h1>
        <p>
          A calm, transparent billing ledger for every customer and every
          installment.
        </p>
      </section>
      <section className={styles.panel}>
        <form onSubmit={submit} className={styles.form}>
          <span className="eyebrow">SECURE ACCESS</span>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <label>
            Email address
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength="6"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 6 characters"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="button primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "New here? Create an account"
              : "Already registered? Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
