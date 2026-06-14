/* ------------------------------------------------------------------ *
 * Thin HTTP client for the Pantry Tracker REST API (app/api/v1).
 *
 * The MCP server is a SEPARATE process from the Next app — it reaches the
 * pantry over HTTP using a bearer device token, exactly like n8n or Home
 * Assistant would. It deliberately holds no DB access; the REST API is the
 * one mutation path (and it writes auditable stock events).
 *
 * Config via env:
 *   PANTRY_API_URL    base URL of the pantry, e.g. http://pantry-host:3000
 *   PANTRY_API_TOKEN  ptk_… token (Settings → Device & API tokens, kind "api")
 * ------------------------------------------------------------------ */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

const BASE = requireEnv("PANTRY_API_URL").replace(/\/+$/, "");
const TOKEN = requireEnv("PANTRY_API_TOKEN");

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  const raw = await res.text();
  const data = raw ? safeJson(raw) : null;

  if (!res.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Pantry API ${res.status} ${path}: ${detail}`);
  }

  return data as T;
}

/** One method per REST endpoint the agent is allowed to use. */
export const pantry = {
  listInventory: () => api("/api/v1/inventory"),
  getItem: (id: number) => api(`/api/v1/items/${id}`),
  createItem: (body: Record<string, unknown>) =>
    api("/api/v1/items", { method: "POST", body: JSON.stringify(body) }),
  editItem: (id: number, body: Record<string, unknown>) =>
    api(`/api/v1/items/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeItem: (id: number) =>
    api(`/api/v1/items/${id}`, { method: "DELETE" }),
  adjustStock: (id: number, delta: number) =>
    api(`/api/v1/items/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify({ delta }),
    }),
  listShopping: () => api("/api/v1/shopping"),
  addShopping: (text: string, storeId?: number) =>
    api("/api/v1/shopping", {
      method: "POST",
      body: JSON.stringify({ text, storeId }),
    }),
  tickShopping: (id: number, ticked: boolean) =>
    api(`/api/v1/shopping/${id}/tick`, {
      method: "POST",
      body: JSON.stringify({ ticked }),
    }),
};
