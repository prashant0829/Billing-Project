"use client";

import Link from "next/link";

export default function Button({ variant = "primary", size = "md", icon, iconOnly = false, href, busy = false, busyLabel = "Saving…", className = "", children, ...rest }) {
  const classes = ["button", variant, size === "sm" ? "small" : "", iconOnly ? "icon-only" : "", className].filter(Boolean).join(" ");
  const a11y = iconOnly ? { "aria-label": children, title: children } : {};
  const content = iconOnly ? icon : <>{icon}{busy ? busyLabel : children}</>;
  if (href) return <Link href={href} className={classes} {...a11y} {...rest}>{content}</Link>;
  return <button className={classes} disabled={busy || rest.disabled} {...a11y} {...rest}>{content}</button>;
}
