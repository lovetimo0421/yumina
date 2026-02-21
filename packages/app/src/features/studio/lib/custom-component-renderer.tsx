import React, { useMemo, useContext, createContext, Component } from "react";
import { compileTSX } from "./tsx-compiler";

/** API exposed to custom components via the useYumina() hook */
export interface YuminaAPI {
  sendMessage: (text: string) => void;
  setVariable: (id: string, value: number | string | boolean) => void;
  variables: Record<string, number | string | boolean>;
  worldName: string;
}

const defaultAPI: YuminaAPI = {
  sendMessage: () => {},
  setVariable: () => {},
  variables: {},
  worldName: "",
};

const YuminaContext = createContext<YuminaAPI>(defaultAPI);

/**
 * The hook that compiled custom components call to interact with the game.
 * Reads from YuminaContext at call time, so it always gets the latest API.
 */
function useYumina(): YuminaAPI {
  return useContext(YuminaContext);
}

interface CustomComponentRendererProps {
  code: string;
  variables: Record<string, number | string | boolean>;
  metadata?: Record<string, unknown>;
  worldName?: string;
  /** When provided, enables interactive features (sendMessage, setVariable) */
  api?: YuminaAPI;
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
  api,
}: CustomComponentRendererProps) {
  // The effective API merges caller-provided actions with live state
  const effectiveAPI = useMemo<YuminaAPI>(
    () => ({
      sendMessage: api?.sendMessage ?? defaultAPI.sendMessage,
      setVariable: api?.setVariable ?? defaultAPI.setVariable,
      variables,
      worldName,
    }),
    [api, variables, worldName]
  );

  // Compile once per code change. The useYumina hook reads from context,
  // so it always gets the latest effectiveAPI via the Provider below.
  const { Component: CompiledComponent, error } = useMemo(
    () => compileTSX(code, useYumina),
    [code]
  );

  if (error) {
    return <ErrorCard message={error} />;
  }

  if (!CompiledComponent) {
    return <ErrorCard message="No component exported" />;
  }

  return (
    <YuminaContext.Provider value={effectiveAPI}>
      <ErrorBoundary fallback={(err) => <ErrorCard message={err} />}>
        <CompiledComponent
          variables={variables}
          metadata={metadata}
          worldName={worldName}
        />
      </ErrorBoundary>
    </YuminaContext.Provider>
  );
}
