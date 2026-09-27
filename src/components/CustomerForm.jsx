"use client";

import { useState } from "react";
import { validateCustomer } from "@/lib/validation";
import Button from "./ui/Button";

const empty = { name: "", primaryContact: "", secondaryContact: "" };

export default function CustomerForm({ initial = empty, onSubmit, submitLabel = "Add customer", showReason = false }) {
  const [values, setValues] = useState({ ...empty, ...initial });
  const [reason, setReason] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); const message = validateCustomer(values);
    if (message) return setError(message);
    setBusy(true); setError("");
    try { await onSubmit(values, reason); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const change = (key) => (e) => setValues({ ...values, [key]: e.target.value });
  return <form className="form-grid" onSubmit={submit}>
    <label>Full name <b>*</b><input value={values.name} onChange={change("name")} placeholder="e.g. Priya Sharma" /></label>
    <label>Primary contact <b>*</b><input value={values.primaryContact} onChange={change("primaryContact")} placeholder="+91 98765 43210" /></label>
    <label>Secondary contact<input value={values.secondaryContact} onChange={change("secondaryContact")} placeholder="Optional" /></label>
    {showReason && <label className="full">Reason for correction<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain what was corrected and why (optional)" /></label>}
    {error && <p className="error full">{error}</p>}
    <Button className="full" busy={busy}>{submitLabel}</Button>
  </form>;
}
