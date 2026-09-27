"use client";

import { X } from "lucide-react";
import Button from "./ui/Button";
import styles from "./Modal.module.scss";

export default function Modal({ open, title, subtitle, onClose, children, wide = false }) {
  if (!open) return null;
  return <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className={`${styles.modal} ${wide ? styles.wide : ""}`} role="dialog" aria-modal="true">
      <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><Button variant="secondary" size="sm" icon={<X size={15}/>} onClick={onClose}>Close</Button></header>
      <div className={styles.body}>{children}</div>
    </section>
  </div>;
}
