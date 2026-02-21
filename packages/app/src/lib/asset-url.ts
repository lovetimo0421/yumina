const apiBase = import.meta.env.VITE_API_URL || "";

// Cache presigned URLs for 50 minutes (they last 1 hour)
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolve an asset reference to a usable URL.
 * - `http://...` or `https://...` → returned as-is
 * - `@asset:{uuid}` → resolved via API to a presigned GET URL (cached 50 min)
 * - Anything else → returned as-is
 */
export async function resolveAssetUrl(ref: string): Promise<string> {
  if (!ref) return ref;

  // Already a full URL
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;

  // Asset reference: @asset:{id}
  if (ref.startsWith("@asset:")) {
    const assetId = ref.slice(7);
    const cached = cache.get(assetId);
    if (cached && cached.expiresAt > Date.now()) return cached.url;

    try {
      const res = await fetch(`${apiBase}/api/assets/${assetId}/url`, {
        credentials: "include",
      });
      if (!res.ok) return ref;
      const { data } = await res.json();
      const url = data.url as string;

      cache.set(assetId, { url, expiresAt: Date.now() + 50 * 60 * 1000 });
      return url;
    } catch {
      return ref;
    }
  }

  return ref;
}

/**
 * Resolve all `@asset:{id}` references in a string to presigned URLs.
 * Used for display transform replacements.
 */
export async function resolveAssetRefs(text: string): Promise<string> {
  const pattern = /@asset:([a-f0-9-]+)/g;
  const matches = [...text.matchAll(pattern)];
  if (matches.length === 0) return text;

  let result = text;
  for (const match of matches) {
    const ref = match[0]; // @asset:{id}
    const resolved = await resolveAssetUrl(ref);
    result = result.replace(ref, resolved);
  }
  return result;
}
