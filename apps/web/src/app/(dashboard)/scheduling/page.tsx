"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/use-api";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface Visit {
  id: string;
  workerId: string;
  serviceRecipientId: string;
  scheduledStart: string;
  scheduledEnd: string;
  verificationStatus: string;
  label: string | null;
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const statusColor: Record<string, string> = {
  verified: "bg-green-200 border-green-400",
  needs_review: "bg-gray-200 border-gray-400",
  check_in_missed: "bg-red-200 border-red-400",
  check_out_missed: "bg-orange-200 border-orange-400",
  missed_visit: "bg-red-100 border-red-300",
};

export default function SchedulingPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeek = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base);
  }, [weekOffset]);

  const dateFrom = formatDate(currentWeek[0]);
  const dateTo = formatDate(currentWeek[6]);

  const { data } = useApiQuery<Visit[]>(
    ["schedule", dateFrom, dateTo],
    `/api/visits?date_from=${dateFrom}T00:00:00Z&date_to=${dateTo}T23:59:59Z`
  );

  const visits = data?.data || [];

  const visitsByDay = useMemo(() => {
    const map: Record<string, Visit[]> = {};
    for (const day of currentWeek) {
      map[formatDate(day)] = [];
    }
    for (const v of visits) {
      const key = new Date(v.scheduledStart).toISOString().split("T")[0];
      if (map[key]) map[key].push(v);
    }
    return map;
  }, [visits, currentWeek]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button><Plus className="mr-2 h-4 w-4" /> New Visit</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {currentWeek.map((day) => {
          const key = formatDate(day);
          const dayVisits = visitsByDay[key] || [];
          const isToday = key === formatDate(new Date());

          return (
            <div key={key} className="min-h-[200px]">
              <div className={`mb-2 rounded px-2 py-1 text-center text-sm font-medium ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div className="space-y-1">
                {dayVisits.map((v) => (
                  <Card
                    key={v.id}
                    className={`cursor-pointer border-l-4 p-2 text-xs ${statusColor[v.verificationStatus] || "bg-blue-100 border-blue-400"}`}
                  >
                    <div className="font-medium">{v.label || "Visit"}</div>
                    <div className="text-muted-foreground">
                      {new Date(v.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {new Date(v.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
