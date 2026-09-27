import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { money, statusTone, type Movement } from "@/lib/finance";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-panel",
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-bold text-foreground">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  footnote,
  icon,
}: {
  label: string;
  value: string;
  footnote: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-panel">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="grid size-7 place-items-center rounded-lg bg-secondary text-primary-soft">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{footnote}</div>
    </div>
  );
}

const toneClasses = {
  success: "bg-success/15 text-success",
  danger: "bg-destructive/15 text-destructive",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
} as const;

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        toneClasses[statusTone(status)],
      )}
    >
      {status}
    </span>
  );
}

export function MarginBadge({ margin, tone }: { margin: number; tone: keyof typeof toneClasses }) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold", toneClasses[tone])}
    >
      {margin.toFixed(1)}%
    </span>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function TableShell({
  head,
  footer,
  children,
}: {
  head: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead className="bg-surface-raised text-left text-[11px] uppercase tracking-wider text-muted-foreground">
          {head}
        </thead>
        <tbody>{children}</tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

const INCOME_STATUSES = ["Pendiente", "Cobrado", "Parcial", "Vencido"];
const EXPENSE_STATUSES = ["Pendiente", "Pagado", "Parcial", "Vencido"];

export function MovementTable({
  rows,
  clientName,
  onStatusChange,
}: {
  rows: Movement[];
  clientName: (id: string | null) => string;
  /** Al pasarla, el estado de cada movimiento se puede cambiar al hacer clic. */
  onStatusChange?: (row: Movement, status: string) => void;
}) {
  return (
    <TableShell
      head={
        <tr>
          <th className="px-4 py-3 font-semibold">Fecha</th>
          <th className="px-4 py-3 font-semibold">Tipo</th>
          <th className="px-4 py-3 font-semibold">Concepto</th>
          <th className="px-4 py-3 font-semibold">Cliente</th>
          <th className="px-4 py-3 font-semibold">Estado</th>
          <th className="px-4 py-3 text-right font-semibold">Monto</th>
        </tr>
      }
    >
      {rows.length === 0 ? (
        <EmptyRow colSpan={6} label="Sin movimientos en este período" />
      ) : (
        rows.map((row) => (
          <tr key={`${row.kind}-${row.id}`} className="border-t border-border">
            <td className="px-4 py-3 text-muted-foreground">{row.date}</td>
            <td className="px-4 py-3">{row.kind}</td>
            <td className="px-4 py-3 font-semibold text-foreground">{row.concept}</td>
            <td className="px-4 py-3 text-muted-foreground">{clientName(row.clientId)}</td>
            <td className="px-4 py-3">
              {onStatusChange && !row.id.startsWith("invoice-") ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title="Cambiar estado"
                      className="cursor-pointer transition-opacity hover:opacity-80"
                    >
                      <StatusBadge status={row.status} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {(row.kind === "Ingreso" ? INCOME_STATUSES : EXPENSE_STATUSES).map(
                      (option) => (
                        <DropdownMenuItem
                          key={option}
                          onClick={() => onStatusChange(row, option)}
                          className={option === row.status ? "font-bold" : ""}
                        >
                          {option}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <StatusBadge status={row.status} />
              )}
            </td>
            <td
              className={cn(
                "px-4 py-3 text-right font-bold",
                row.kind === "Ingreso" ? "text-success" : "text-foreground",
              )}
            >
              {money(row.amount, row.currency)}
            </td>
          </tr>
        ))
      )}
    </TableShell>
  );
}
