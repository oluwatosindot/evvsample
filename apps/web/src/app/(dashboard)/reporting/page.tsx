"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import { Plus, Download, FileText } from "lucide-react";

interface Report {
  id: string;
  name: string;
  status: string;
  outputFormat: string;
  progress: number;
  outputUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

const statusBadge: Record<string, string> = {
  queued: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const columns = [
  {
    key: "name",
    label: "Report Name",
    render: (row: Report) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        {row.name}
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (row: Report) => (
      <Badge className={statusBadge[row.status] || ""}>{row.status}</Badge>
    ),
  },
  { key: "outputFormat", label: "Format" },
  {
    key: "progress",
    label: "Progress",
    render: (row: Report) => (
      <div className="flex items-center gap-2">
        <div className="h-2 w-24 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${row.progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{row.progress}%</span>
      </div>
    ),
  },
  {
    key: "createdAt",
    label: "Created",
    render: (row: Report) => new Date(row.createdAt).toLocaleString(),
  },
  {
    key: "actions",
    label: "",
    render: (row: Report) =>
      row.status === "completed" ? (
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4" />
        </Button>
      ) : null,
  },
];

const defaultTemplates = [
  { name: "Visit Summary", description: "Summary of all visits by date range" },
  { name: "Verification Compliance", description: "Missed check-ins, exceptions" },
  { name: "Workforce Utilization", description: "Hours scheduled vs. worked" },
  { name: "Billing Summary", description: "Revenue by period, service type" },
  { name: "Payroll Report", description: "Hours worked, overtime, by worker" },
  { name: "Credential Status", description: "Upcoming expirations, overdue" },
];

export default function ReportingPage() {
  const { data, isLoading } = useApiQuery<Report[]>(["reports"], "/api/reports");
  const createMutation = useApiMutation<{ name: string; templateId: string }>("/api/reports");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Report Center</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {defaultTemplates.map((t) => (
          <Card key={t.name} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{t.description}</p>
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-3 w-3" /> Generate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Generated Reports</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <DataTable columns={columns} data={data?.data || []} />
        )}
      </div>
    </div>
  );
}
