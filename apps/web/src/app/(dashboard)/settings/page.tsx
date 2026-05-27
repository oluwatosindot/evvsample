"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface ServiceType {
  id: string;
  name: string;
  code: string | null;
  unitType: string;
  unitRate: number;
  isActive: boolean;
  color: string | null;
}

type SettingsTab = "general" | "service-types" | "roles";

const serviceTypeColumns = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
  { key: "unitType", label: "Unit Type" },
  {
    key: "unitRate",
    label: "Rate",
    render: (row: ServiceType) => `$${(row.unitRate / 100).toFixed(2)}`,
  },
  {
    key: "isActive",
    label: "Status",
    render: (row: ServiceType) => (
      <Badge variant={row.isActive ? "default" : "secondary"}>
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "color",
    label: "Color",
    render: (row: ServiceType) =>
      row.color ? (
        <div
          className="h-5 w-5 rounded-full border"
          style={{ backgroundColor: row.color }}
        />
      ) : (
        "-"
      ),
  },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("general");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organization Settings</h1>

      <div className="flex gap-2 border-b">
        {[
          { key: "general", label: "General" },
          { key: "service-types", label: "Service Catalog" },
          { key: "roles", label: "Roles & Permissions" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as SettingsTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralSettings />}
      {tab === "service-types" && <ServiceTypesTab />}
      {tab === "roles" && <RolesTab />}
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input defaultValue="Demo Healthcare Agency" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input defaultValue="America/New_York" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input defaultValue="USD" />
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terminology</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Visit Term</Label>
              <Input defaultValue="Visit" />
            </div>
            <div className="space-y-2">
              <Label>Client Term</Label>
              <Input defaultValue="Patient" />
            </div>
            <div className="space-y-2">
              <Label>Worker Term</Label>
              <Input defaultValue="Caregiver" />
            </div>
            <div className="space-y-2">
              <Label>Trip Term</Label>
              <Input defaultValue="Trip" />
            </div>
          </div>
          <Button>Save Terminology</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GPS Radius (meters)</Label>
              <Input type="number" defaultValue="150" />
            </div>
            <div className="space-y-2">
              <Label>Max Shift Hours</Label>
              <Input type="number" defaultValue="12" />
            </div>
          </div>
          <Button>Save Rules</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceTypesTab() {
  const { data, isLoading } = useApiQuery<ServiceType[]>(["service-types"], "/api/settings/service-types");
  const createMutation = useApiMutation("/api/settings/service-types");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    unitType: "hours",
    unitRate: 0,
    color: "#3b82f6",
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      unitRate: Math.round(form.unitRate * 100),
    });
    setOpen(false);
    setForm({ name: "", code: "", unitType: "hours", unitRate: 0, color: "#3b82f6" });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Service Type</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Service Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g., T2016" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Rate ($)</Label>
                  <Input type="number" step="0.01" value={form.unitRate} onChange={(e) => setForm({ ...form, unitRate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
              </div>
              <Button type="submit">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable columns={serviceTypeColumns} data={data?.data || []} />
      )}
    </div>
  );
}

function RolesTab() {
  const roles = [
    { name: "Super Admin", permissions: "Full access to all modules", isSystem: true },
    { name: "Admin", permissions: "Full access, limited settings", isSystem: true },
    { name: "Manager", permissions: "Team view for operations, scheduling", isSystem: true },
    { name: "Scheduler", permissions: "Full scheduling access", isSystem: true },
    { name: "Billing Specialist", permissions: "Full billing access", isSystem: true },
    { name: "Field Worker", permissions: "Own schedule and tasks only", isSystem: true },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{role.name}</span>
                  {role.isSystem && (
                    <Badge variant="secondary" className="text-xs">System</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{role.permissions}</p>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
