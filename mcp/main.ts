/* ------------------------------------------------------------------ *
 * Pantry Tracker MCP server — HTTP entrypoint.
 *
 * Serves the tools from server.ts over the MCP Streamable HTTP transport so
 * Hermes (on the LAN) connects to a URL: http://<this-host>:<MCP_PORT><MCP_PATH>.
 *
 * Session-based: an `initialize` POST mints a session (mcp-session-id header),
 * subsequent POSTs reuse it, GET opens the SSE stream, DELETE tears it down —
 * the standard Streamable HTTP handshake, so any compliant MCP client works.
 *
 * Config via env (plus PANTRY_API_URL / PANTRY_API_TOKEN, see pantry-client):
 *   MCP_PORT        listen port (default 3001)
 *   MCP_PATH        endpoint path (default /mcp)
 *   MCP_AUTH_TOKEN  optional shared secret Hermes must send as
 *                   `Authorization: Bearer <token>`; if unset, no auth (LAN only)
 *
 *   tsx mcp/main.ts
 * ------------------------------------------------------------------ */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { buildServer } from "@/mcp/server";

const PORT = Number(process.env.MCP_PORT ?? 3001);
const MCP_PATH = process.env.MCP_PATH ?? "/mcp";
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

/** Live transports keyed by session id. */
const transports = new Map<string, StreamableHTTPServerTransport>();

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function rpcError(res: ServerResponse, status: number, message: string): void {
  send(res, status, { jsonrpc: "2.0", error: { code: -32000, message }, id: null });
}

/** Optional shared-secret gate in front of the MCP endpoint. */
function authorised(req: IncomingMessage): boolean {
  if (!AUTH_TOKEN) return true;
  return req.headers.authorization === `Bearer ${AUTH_TOKEN}`;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/health") return send(res, 200, { ok: true });
  if (url.pathname !== MCP_PATH) return send(res, 404, { error: "not_found" });

  if (!authorised(req)) {
    return send(res, 401, {
      jsonrpc: "2.0",
      error: { code: -32001, message: "unauthorised" },
      id: null,
    });
  }

  const sessionId = req.headers["mcp-session-id"];
  const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;

  try {
    /* POST — JSON-RPC messages (initialize, tools/list, tools/call, …). */
    if (req.method === "POST") {
      const body = await readBody(req);
      let transport = sid ? transports.get(sid) : undefined;

      if (!transport) {
        if (sid || !isInitializeRequest(body)) {
          return rpcError(res, 400, "No valid session ID provided");
        }
        /* New session: spin up a transport + server and register on init. */
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport!);
          },
        });
        transport.onclose = () => {
          if (transport!.sessionId) transports.delete(transport!.sessionId);
        };
        await buildServer().connect(transport);
      }

      return await transport.handleRequest(req, res, body);
    }

    /* GET — open the SSE stream; DELETE — terminate the session. */
    if (req.method === "GET" || req.method === "DELETE") {
      const transport = sid ? transports.get(sid) : undefined;
      if (!transport) return rpcError(res, 400, "No valid session ID provided");
      return await transport.handleRequest(req, res);
    }

    res.writeHead(405, { allow: "GET, POST, DELETE" });
    res.end();
  } catch (err) {
    console.error("[mcp] request error:", err);
    if (!res.headersSent) {
      send(res, 500, {
        jsonrpc: "2.0",
        error: { code: -32603, message: "internal error" },
        id: null,
      });
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`[mcp] pantry MCP server on :${PORT}${MCP_PATH} (streamable-http)`);
  if (!AUTH_TOKEN) console.warn("[mcp] MCP_AUTH_TOKEN unset — endpoint is open on the LAN");
});
