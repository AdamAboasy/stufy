import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  default: "bg-surface-muted text-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/18 text-amber-700 dark:text-warning",
  danger: "bg-danger/12 text-danger",
  neutral: "bg-muted/15 text-muted",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof styles }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium",
        styles[tone],
        className,
      )}
      {...props}
    />
  );
}

export function statusTone(status: string): keyof typeof styles {
  if (["active", "completed", "available", "approved", "success"].includes(status)) return "success";
  if (["pending", "queued", "processing", "in_progress", "requires_review", "delayed"].includes(status))
    return "warning";
  if (["failed", "revoked", "suspended", "expired", "rejected", "danger"].includes(status)) return "danger";
  if (["not_started", "draft", "paused"].includes(status)) return "neutral";
  return "primary";
}
