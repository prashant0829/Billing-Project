"use client";

import Modal from "@/components/Modal";
import Button from "./Button";

export default function ConfirmDialog({ open, title, subtitle, itemLabel, reason, onReasonChange, onCancel, onConfirm, busy, confirmLabel = "Delete", showReason = true }) {
  return <Modal open={open} onClose={onCancel} title={title} subtitle={subtitle}>
    {open && <div className="form-grid">
      <p className="full">Are you sure you want to delete {itemLabel}?</p>
      {showReason && <label className="full">Reason<textarea value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Explain why this is being deleted (optional)"/></label>}
      <div className="full confirm-actions">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} busy={busy} busyLabel="Deleting…">{confirmLabel}</Button>
      </div>
    </div>}
  </Modal>;
}
