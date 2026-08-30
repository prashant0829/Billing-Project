"use client";

import { useState } from "react";
import { today } from "@/lib/formatters";
import { validAmount } from "@/lib/validation";

export default function EntryForm({ type, initial, requireReason = false, onSubmit }) {
  const isBill = type === "bill";
  const defaults = isBill ? { billId: "", description: "", amount: "", billDate: today(), status: "pending" } : { amount: "", paidAt: today(), note: "" };
  const normalizedInitial = isBill && initial ? { ...initial, status: String(initial.status || "pending").toLowerCase() } : initial;
  const [values, setValues] = useState({ ...defaults, ...normalizedInitial }); const [reason, setReason] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const change = (key) => (e) => setValues({ ...values, [key]: e.target.value });
  async function submit(event) {
    event.preventDefault();
    if (!validAmount(values.amount) || (isBill && (!values.billId.trim() || !values.description.trim())) || (requireReason && !reason.trim())) return setError("Complete all required fields with a valid positive amount.");
    setBusy(true); setError("");
    try { await onSubmit(values, reason); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    {isBill && <label>Bill ID <b>*</b><input value={values.billId} onChange={change("billId")} placeholder="BILL-2026-001" /></label>}
    {isBill && <label>Status <b>*</b><select value={values.status || "pending"} onChange={change("status")}><option value="pending">Pending</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></label>}
    {isBill && <label className="full">Order / bill description <b>*</b><input value={values.description} onChange={change("description")} placeholder="What was this bill for?" /></label>}
    <label>Amount (₹) <b>*</b><input type="number" min="0.01" step="0.01" value={values.amount} onChange={change("amount")} placeholder="0.00" /></label>
    <label>{isBill ? "Bill generated on" : "Payment date"} <b>*</b><input type="date" value={isBill ? values.billDate : values.paidAt} onChange={change(isBill ? "billDate" : "paidAt")} /></label>
    {!isBill && <label className="full">Payment note<textarea value={values.note} onChange={change("note")} placeholder="Cash, UPI reference, etc. (optional)" /></label>}
    {requireReason && <label className="full">Reason for correction <b>*</b><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain what was corrected and why" /></label>}
    {error && <p className="error full">{error}</p>}
    <button className="button primary full" disabled={busy}>{busy ? "Saving…" : requireReason ? "Save correction" : isBill ? "Add bill" : "Record payment"}</button>
  </form>;
}
