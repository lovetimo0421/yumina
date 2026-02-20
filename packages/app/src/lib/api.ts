import { hc } from "hono/client";
import type { AppType } from "@yumina/server";

const baseUrl = import.meta.env.VITE_API_URL || "";

export const api = hc<AppType>(baseUrl, {
  init: {
    credentials: "include",
  },
});
