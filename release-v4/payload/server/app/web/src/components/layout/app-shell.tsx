"use client";

import { useState, type ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-72">
        <Sidebar />
      </div>

      <Sheet
        open={isMobileSidebarOpen}
        onOpenChange={setIsMobileSidebarOpen}
      >
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavigate={() => setIsMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-72">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="p-4 lg:p-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}