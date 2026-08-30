"use client";

import { X } from "lucide-react";
import styles from "./Modal.module.scss";

export default function Modal({ open, title, subtitle, onClose, children, wide = false }) {
  if (!open) return null;
  return <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className={`${styles.modal} ${wide ? styles.wide : ""}`} role="dialog" aria-modal="true">
      <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button onClick={onClose} aria-label="Close"><X /></button></header>
      <div className={styles.body}>{children}</div>
    </section>
  </div>;
}
