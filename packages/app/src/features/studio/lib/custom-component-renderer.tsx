import React, { useMemo, Component } from "react";
import { compileTSX } from "./tsx-compiler";

interface CustomComponentRendererProps {
  code: string;
  variables: Record<string, number | string | boolean>;
  metadata?: Record<string, unknown>;
  worldName?: string;
}

class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback: (error: string) => React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs font-medium text-destructive">Component Error</p>
      <p className="mt-1 text-xs text-destructive/70 font-mono">{message}</p>
    </div>
  );
}

export function CustomComponentRenderer({
  code,
  variables,
  metadata = {},
  worldName = "",
}: CustomComponentRendererProps) {
  const { Component: CompiledComponent, error } = useMemo(
    () => compileTSX(code),
    [code]
  );

  if (error) {
    return <ErrorCard message={error} />;
  }

  if (!CompiledComponent) {
    return <ErrorCard message="No component exported" />;
  }

  return (
    <ErrorBoundary fallback={(err) => <ErrorCard message={err} />}>
      <CompiledComponent
        variables={variables}
        metadata={metadata}
        worldName={worldName}
      />
    </ErrorBoundary>
  );
}
