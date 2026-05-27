"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery } from "@/hooks/use-api";
import { Plus } from "lucide-react";

interface Recipient {
  id: string;
  name: string;
  type: string;
  status: string;
  phone: string | null;
  email: string | null;
}

const columns = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  {
    key: "status",
    label: "Status",
    render: (row: Recipient) => (
      <Badge variant={row.status === "active" ? "default" : "secondary"}>
        {row.status}
      </Badge>
    ),
  },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
];

export default function RecipientsPage() {
  const router = useRouter();
  const { data, isLoading } = useApiQuery<Recipient[]>(["recipients"], "/api/recipients");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service Recipients</h1>
        <Button onClick={() => router.push("/recipients/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Recipient
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
