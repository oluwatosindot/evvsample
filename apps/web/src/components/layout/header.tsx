"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import { LogOut, Bell, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export function AppHeader() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [showNotifs, setShowNotifs] = useState(false);

  const { data: unreadData } = useApiQuery<{ count: number }>(
    ["unread-count"],
    "/api/notifications/unread-count"
  );
  const { data: notifsData } = useApiQuery<Notification[]>(
    ["notifications"],
    "/api/notifications"
  );
  const markRead = useApiMutation<void>("/api/notifications", { method: "PATCH" });

  const unreadCount = unreadData?.data?.count ?? 0;
  const notifications = notifsData?.data || [];

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search everything... (Ctrl+F)" className="w-80 pl-10" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {showNotifs && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border bg-white shadow-lg">
              <div className="flex items-center justify-between border-b p-3">
                <span className="text-sm font-semibold">Notifications</span>
                <Button variant="ghost" size="icon" onClick={() => setShowNotifs(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">No notifications</p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`border-b p-3 text-sm ${n.read ? "" : "bg-blue-50"}`}
                    >
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.body}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{user?.name}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
