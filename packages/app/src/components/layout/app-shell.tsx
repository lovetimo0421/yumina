import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="grid h-screen overflow-hidden" style={{ gridTemplateColumns: "var(--sidebar-width, 260px) 1fr" }}>
      <Sidebar />
      <main className="overflow-auto">{children}</main>
    </div>
  );
}
