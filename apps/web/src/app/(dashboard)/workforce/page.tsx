"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery } from "@/hooks/use-api";
import { Plus } from "lucide-react";

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  employmentType: string;
  hireDate: string | null;
}

const columns = [
  {
    key: "name",
    label: "Name",
    render: (row: Worker) => `${row.firstName} ${row.lastName}`,
  },
  { key: "position", label: "Position" },
  {
    key: "status",
    label: "Status",
    render: (row: Worker) => (
      <Badge variant={row.status === "active" ? "default" : "secondary"}>
        {row.status}
      </Badge>
    ),
  },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "employmentType", label: "Type" },
  { key: "hireDate", label: "Hire Date" },
];

export default function WorkforcePage() {
  const router = useRouter();
  const { data, isLoading } = useApiQuery<Worker[]>(["workers"], "/api/workers");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workforce</h1>
        <Button onClick={() => router.push("/workforce/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Employee
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable columns={columns} data={data?.data || []} />
      )}
    </div>
  );
}
