import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useUiStore } from "@/stores/ui";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarOpen } = useUiStore();

  return (
    <div
      className="grid h-screen overflow-hidden transition-[grid-template-columns] duration-200"
      style={{
        gridTemplateColumns: `${sidebarOpen ? "var(--sidebar-width, 260px)" : "var(--sidebar-collapsed-width, 60px)"} 1fr`,
      }}
    >
      <Sidebar />
      <main className="overflow-hidden">{children}</main>
      <Toaster />
    </div>
  );
}
