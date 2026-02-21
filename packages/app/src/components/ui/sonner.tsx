import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        className: "!bg-card !text-foreground !border-border",
      }}
    />
  );
}
