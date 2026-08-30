"use client";

import { useState } from "react";
import { validateCustomer } from "@/lib/validation";

const empty = { name: "", primaryContact: "", secondaryContact: "" };

export default function CustomerForm({ initial = empty, onSubmit, submitLabel = "Add customer", requireReason = false }) {
  const [values, setValues] = useState({ ...empty, ...initial });
  const [reason, setReason] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); const message = validateCustomer(values);
    if (message || (requireReason && !reason.trim())) return setError(message || "A reason is required for every correction.");
    setBusy(true); setError("");
    try { await onSubmit(values, reason); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const change = (key) => (e) => setValues({ ...values, [key]: e.target.value });
  return <form className="form-grid" onSubmit={submit}>
    <label>Full name <b>*</b><input value={values.name} onChange={change("name")} placeholder="e.g. Priya Sharma" /></label>
    <label>Primary contact <b>*</b><input value={values.primaryContact} onChange={change("primaryContact")} placeholder="+91 98765 43210" /></label>
    <label>Secondary contact<input value={values.secondaryContact} onChange={change("secondaryContact")} placeholder="Optional" /></label>
    {requireReason && <label className="full">Reason for correction <b>*</b><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain what was corrected and why" /></label>}
    {error && <p className="error full">{error}</p>}
    <button className="button primary full" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
  </form>;
}
