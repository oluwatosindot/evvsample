"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery } from "@/hooks/use-api";

interface Visit {
  id: string;
  serviceRecipientId: string;
  workerId: string;
  verificationStatus: string;
  billingStatus: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  scheduledUnits: string | null;
  actualUnits: string | null;
}

const statusCards = [
  { key: "verified", label: "Up to Date", color: "bg-green-100 text-green-800" },
  { key: "check_in_missed", label: "Check-in Missed", color: "bg-red-100 text-red-800" },
  { key: "check_out_missed", label: "Check-out Missed", color: "bg-orange-100 text-orange-800" },
  { key: "missed_visit", label: "Missed Visit", color: "bg-orange-100 text-orange-800" },
  { key: "needs_review", label: "Needs Review", color: "bg-yellow-100 text-yellow-800" },
  { key: "invalid_data", label: "Invalid Data", color: "bg-red-100 text-red-800" },
];

const columns = [
  { key: "serviceRecipientId", label: "Recipient" },
  {
    key: "verificationStatus",
    label: "Status",
    render: (row: Visit) => {
      const card = statusCards.find((c) => c.key === row.verificationStatus);
      return <Badge className={card?.color}>{card?.label || row.verificationStatus}</Badge>;
    },
  },
  { key: "workerId", label: "Worker" },
  {
    key: "scheduledStart",
    label: "Scheduled",
    render: (row: Visit) => new Date(row.scheduledStart).toLocaleString(),
  },
  {
    key: "actualStart",
    label: "Actual",
    render: (row: Visit) => row.actualStart ? new Date(row.actualStart).toLocaleString() : "-",
  },
  { key: "scheduledUnits", label: "Sched. Units" },
  { key: "actualUnits", label: "Actual Units" },
];

export default function OperationsPage() {
  const [filter, setFilter] = useState<string | null>(null);
  const { data, isLoading } = useApiQuery<Visit[]>(
    ["visits", filter ?? "all"],
    filter ? `/api/visits?status=${filter}` : "/api/visits"
  );

  const visits = data?.data || [];

  const counts = statusCards.map((sc) => ({
    ...sc,
    count: visits.filter((v) => v.verificationStatus === sc.key).length,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Operations Worklist</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {counts.map((sc) => (
          <Card
            key={sc.key}
            className={`cursor-pointer transition-shadow hover:shadow-md ${filter === sc.key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilter(filter === sc.key ? null : sc.key)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{sc.count}</div>
              <div className="text-xs text-muted-foreground">{sc.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={filter ? visits.filter((v) => v.verificationStatus === filter) : visits}
        />
      )}
    </div>
  );
}
