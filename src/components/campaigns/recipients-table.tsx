"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecipientWithCustomer } from "@/lib/services/campaigns";
import type { RecipientStatus } from "@/types";
import {
  RECIPIENT_STATUS_LABELS,
  RECIPIENT_STATUS_STYLES,
} from "./campaign-meta";

interface RecipientsTableProps {
  recipients: RecipientWithCustomer[];
}

export function RecipientsTable({ recipients }: RecipientsTableProps) {
  if (recipients.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay destinatarios. Materializa la campaña para generarlos.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Mensaje</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((r) => {
            const status = r.status as RecipientStatus;
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.customer?.full_name ||
                    `${r.customer?.first_name ?? ""} ${r.customer?.last_name ?? ""}`.trim() ||
                    "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {r.customer?.phone || r.customer?.email || "—"}
                </TableCell>
                <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                  {r.rendered_message}
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${RECIPIENT_STATUS_STYLES[status] ?? ""}`}
                  >
                    {RECIPIENT_STATUS_LABELS[status] ?? status}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
