"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery } from "@/hooks/use-api";

interface Visit {
  id: string;
  serviceRecipientId: string;
  billingStatus: string;
  scheduledStart: string;
  actualUnits: string | null;
  scheduledUnits: string | null;
}

const billingCards = [
  { key: "unbilled", label: "Unbilled", color: "bg-gray-100 text-gray-800" },
  { key: "on_hold", label: "On Hold", color: "bg-yellow-100 text-yellow-800" },
  { key: "ready_to_bill", label: "Ready to Bill", color: "bg-blue-100 text-blue-800" },
  { key: "billed", label: "Billed", color: "bg-green-100 text-green-800" },
  { key: "denied", label: "Denied", color: "bg-red-100 text-red-800" },
  { key: "paid", label: "Paid", color: "bg-green-200 text-green-900" },
];

const columns = [
  { key: "serviceRecipientId", label: "Recipient" },
  {
    key: "billingStatus",
    label: "Billing Status",
    render: (row: Visit) => {
      const card = billingCards.find((c) => c.key === row.billingStatus);
      return <Badge className={card?.color}>{card?.label || row.billingStatus}</Badge>;
    },
  },
  {
    key: "scheduledStart",
    label: "Date",
    render: (row: Visit) => new Date(row.scheduledStart).toLocaleDateString(),
  },
  { key: "scheduledUnits", label: "Sched. Units" },
  { key: "actualUnits", label: "Actual Units" },
];

export default function BillingPage() {
  const [filter, setFilter] = useState<string | null>(null);
  const { data, isLoading } = useApiQuery<Visit[]>(
    ["billing", filter ?? "all"],
    filter ? `/api/billing/worklist?status=${filter}` : "/api/billing/worklist"
  );

  const visits = data?.data || [];

  const counts = billingCards.map((bc) => ({
    ...bc,
    count: visits.filter((v) => v.billingStatus === bc.key).length,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing Worklist</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {counts.map((bc) => (
          <Card
            key={bc.key}
            className={`cursor-pointer transition-shadow hover:shadow-md ${filter === bc.key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilter(filter === bc.key ? null : bc.key)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{bc.count}</div>
              <div className="text-xs text-muted-foreground">{bc.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={filter ? visits.filter((v) => v.billingStatus === filter) : visits}
        />
      )}
    </div>
  );
}
