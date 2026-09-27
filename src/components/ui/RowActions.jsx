"use client";

import Button from "./Button";

export default function RowActions({ actions }) {
  return <span className="row-actions">
    {actions.map((action) => (
      <Button key={action.label} variant={action.variant || "secondary"} size="sm" iconOnly icon={action.icon} href={action.href} onClick={action.onClick}>
        {action.label}
      </Button>
    ))}
  </span>;
}
