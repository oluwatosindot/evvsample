"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, FileText } from "lucide-react";

interface FormTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
}

const columns = [
  {
    key: "name",
    label: "Template Name",
    render: (row: FormTemplate) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{row.name}</span>
      </div>
    ),
  },
  {
    key: "description",
    label: "Description",
    render: (row: FormTemplate) => row.description || "-",
  },
  { key: "category", label: "Category" },
  {
    key: "version",
    label: "Version",
    render: (row: FormTemplate) => `v${row.version}`,
  },
  {
    key: "isActive",
    label: "Status",
    render: (row: FormTemplate) => (
      <Badge variant={row.isActive ? "default" : "secondary"}>
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "createdAt",
    label: "Created",
    render: (row: FormTemplate) => new Date(row.createdAt).toLocaleDateString(),
  },
];

export default function FormsPage() {
  const { data, isLoading } = useApiQuery<FormTemplate[]>(["form-templates"], "/api/forms/templates");
  const createMutation = useApiMutation("/api/forms/templates", {
    onSuccess: () => setOpen(false),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "" });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      schema: {
        type: "object",
        properties: {
          notes: { type: "string", title: "Notes" },
        },
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Digital Forms</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Form Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Inspection Checklist"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this form for?"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g., Clinical, Inspection"
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable columns={columns} data={data?.data || []} />
      )}
    </div>
  );
}
