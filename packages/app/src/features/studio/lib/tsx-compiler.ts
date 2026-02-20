import { transform } from "sucrase";
import React from "react";

interface CompileResult {
  Component: React.ComponentType<Record<string, unknown>> | null;
  error: string | null;
}

/**
 * Compiles TSX code string into a React component using Sucrase.
 * Uses `new Function()` with a controlled scope (React only).
 */
export function compileTSX(code: string): CompileResult {
  try {
    // Transform TSX → JS
    const result = transform(code, {
      transforms: ["typescript", "jsx"],
      jsxRuntime: "classic",
      production: true,
    });

    // Wrap in a function that returns the default export
    const wrappedCode = `
      ${result.code}
      return typeof exports !== 'undefined' && exports.default
        ? exports.default
        : typeof module !== 'undefined' && module.exports && module.exports.default
          ? module.exports.default
          : typeof MyComponent !== 'undefined'
            ? MyComponent
            : null;
    `;

    // Create component factory with controlled scope
    const factory = new Function("React", "exports", "module", wrappedCode);
    const exports: Record<string, unknown> = {};
    const module = { exports: {} as Record<string, unknown> };
    const Component = factory(React, exports, module);

    if (typeof Component === "function") {
      return { Component, error: null };
    }

    // Try to find a named export that's a function
    const defaultExport = exports.default ?? module.exports.default;
    if (typeof defaultExport === "function") {
      return { Component: defaultExport as React.ComponentType<Record<string, unknown>>, error: null };
    }

    return { Component: null, error: "No component exported. Use `export default function ...`" };
  } catch (err) {
    return {
      Component: null,
      error: err instanceof Error ? err.message : "Compilation failed",
    };
  }
}
