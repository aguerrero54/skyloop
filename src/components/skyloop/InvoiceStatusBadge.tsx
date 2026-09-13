import { cn } from "@/lib/utils";
import { invoiceStatusTone, type InvoiceStatus } from "@/lib/invoices";

const tones = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
  muted: "bg-secondary text-muted-foreground",
} as const;

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        tones[invoiceStatusTone[status]],
        className,
      )}
    >
      {status}
    </span>
  );
}
