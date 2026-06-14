# Pantry Tracker MCP server

A thin [MCP](https://modelcontextprotocol.io) server that exposes the pantry's
REST API (`app/api/v1`) as tools, so a LAN agent (Hermes at `192.168.0.87`) can
read and modify the inventory and shopping list in natural language.

It is a **separate process** from the Next app. It holds no database access —
every action goes through the REST API over HTTP with a bearer token, which is
the app's single auditable mutation path.

## Tools

| Tool | REST endpoint | Purpose |
|---|---|---|
| `list_inventory` | `GET /api/v1/inventory` | "Do we have pineapple?" → list + match |
| `get_item` | `GET /api/v1/items/:id` | Full detail (nutriments, ingredients, barcodes) |
| `add_item` | `POST /api/v1/items` | Create item (starts at quantity 0) |
| `edit_item` | `PATCH /api/v1/items/:id` | Edit fields (partial) |
| `remove_item` | `DELETE /api/v1/items/:id` | Archive (remove from inventory) |
| `adjust_stock` | `POST /api/v1/items/:id/adjust` | Change stock by delta (writes a stock event) |
| `list_shopping` | `GET /api/v1/shopping` | Read shopping list |
| `add_shopping` | `POST /api/v1/shopping` | "Add toilet paper to the list" |
| `tick_shopping` | `POST /api/v1/shopping/:id/tick` | Mark purchased/done — the only way to clear an item (no delete) |

## Config (env)

| Var | Required | Default | Notes |
|---|---|---|---|
| `PANTRY_API_URL` | yes | — | Base URL of the pantry, e.g. `http://app:3000` in compose |
| `PANTRY_API_TOKEN` | yes | — | `ptk_…` from Settings → Device & API tokens (kind "api") |
| `MCP_PORT` | no | `3001` | Listen port |
| `MCP_PATH` | no | `/mcp` | Endpoint path |
| `MCP_AUTH_TOKEN` | no | — | Shared secret Hermes must send as `Authorization: Bearer …`. Unset = open on the LAN |

## Run

**Docker (recommended).** A `mcp` service is wired into `docker-compose.yml`. It
reaches the app over the compose network (`app:3000` stays internal) and
publishes only `:3001` to the LAN.

```bash
# .env
PANTRY_API_TOKEN=ptk_xxxxxxxx      # mint in Settings → Device & API tokens
MCP_AUTH_TOKEN=$(openssl rand -hex 32)   # optional but recommended

docker compose up -d --build mcp
```

**Local dev.**

```bash
PANTRY_API_URL=http://localhost:3000 PANTRY_API_TOKEN=ptk_xxx pnpm mcp
```

## Wire up Hermes

Point Hermes's MCP client at the Streamable HTTP URL:

```
http://<homelab-ip>:3001/mcp
```

If `MCP_AUTH_TOKEN` is set, add header `Authorization: Bearer <that token>`.

Suggested system-prompt note for the agent:

> You manage a household pantry through MCP tools. To answer "do we have X",
> call `list_inventory` and match by name — item ids come from there, never
> guess them. New items start at quantity 0; after `add_item`, call
> `adjust_stock` to set stock. Quantities change only via `adjust_stock`
> (delta -1 used, +1 bought). To clear a shopping item, `tick_shopping`
> with `ticked: true` — there is no delete.

## Smoke test

```bash
BASE=http://<homelab-ip>:3001
# health
curl -s $BASE/health
# MCP handshake → grab the mcp-session-id response header, then tools/list
curl -si -X POST $BASE/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}'
```
