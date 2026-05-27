"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/use-api";

interface Metrics {
  visitsToday: number;
  visitsThisWeek: number;
  complianceRate: number;
  activeWorkers: number;
  alertCount: number;
}

export default function DashboardPage() {
  const { data, isLoading } = useApiQuery<Metrics>(["dashboard-metrics"], "/api/dashboard/metrics");
  const metrics = data?.data;

  const stats = [
    { label: "Visits Today", value: metrics?.visitsToday ?? 0 },
    { label: "Visits This Week", value: metrics?.visitsThisWeek ?? 0 },
    { label: "Compliance Rate", value: metrics ? `${metrics.complianceRate}%` : "--" },
    { label: "Active Workers", value: metrics?.activeWorkers ?? 0 },
    { label: "Alerts", value: metrics?.alertCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
