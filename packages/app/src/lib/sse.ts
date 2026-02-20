export interface SSECallbacks {
  onText: (content: string) => void;
  onDone: (data: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

/**
 * Connect to an SSE endpoint and process events.
 * Returns an AbortController so the caller can cancel the stream.
 */
export function connectSSE(
  url: string,
  options: {
    method: "POST";
    body: unknown;
    callbacks: SSECallbacks;
  }
): AbortController {
  const controller = new AbortController();

  fetch(url, {
    method: options.method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(options.body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text();
        options.callbacks.onError(`HTTP ${response.status}: ${text}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        options.callbacks.onError("No response body");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              switch (currentEvent) {
                case "text":
                  options.callbacks.onText(parsed.content ?? "");
                  break;
                case "done":
                  options.callbacks.onDone(parsed);
                  break;
                case "error":
                  options.callbacks.onError(parsed.error ?? "Unknown error");
                  break;
              }
            } catch {
              // Skip unparseable lines
            }
            currentEvent = "";
          }
        }
      }
    })
    .catch((err) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      options.callbacks.onError(
        err instanceof Error ? err.message : "Connection failed"
      );
    });

  return controller;
}
