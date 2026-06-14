# Connect Hermes to the Pantry Tracker MCP server

This guide is for whoever (or whatever agent) sets up **Hermes** on the machine
at `192.168.0.87`. It connects Hermes to the household Pantry Tracker so it can
read and change the inventory and shopping list in natural language — e.g.
*"do we have pineapple?"* or *"add toilet paper to the shopping list."*

You do **not** need any source code on this machine. The pantry runs an MCP
server elsewhere on the LAN; you just point Hermes at its URL.

---

## 1. Connection details

Fill these in from the person running the pantry host, then keep this table handy
— every step below refers to it.

| Field | Value |
|---|---|
| **MCP endpoint URL** | `http://<PANTRY_HOST_IP>:3001/mcp` |
| **Transport** | Streamable HTTP (a.k.a. `http` / `streamable-http`) |
| **Auth header** | `Authorization: Bearer <MCP_AUTH_TOKEN>`  *(omit if no token was set)* |
| **Health check** | `http://<PANTRY_HOST_IP>:3001/health` |

> `<PANTRY_HOST_IP>` is the LAN address of the machine running the pantry (same
> `192.168.0.x` network as this box). `<MCP_AUTH_TOKEN>` is a shared secret the
> pantry operator generated; if they left it blank, skip the auth header.

---

## 2. Verify you can reach it (before touching Hermes)

Run these from the Hermes machine. They prove the endpoint is reachable and the
token is right — if these fail, fix connectivity first; Hermes will not work
until they pass.

```bash
BASE=http://<PANTRY_HOST_IP>:3001
TOKEN=<MCP_AUTH_TOKEN>     # the value from the table; skip -H below if unset

# a) liveness
curl -s $BASE/health
# expect: {"ok":true}

# b) full MCP handshake — initialize then list the tools
curl -si -X POST $BASE/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"setup-check","version":"0"}}}'
# expect: HTTP/1.1 200, an `mcp-session-id:` response header, and a JSON-RPC
# result naming "pantry-tracker".
```

If (a) fails: wrong IP/port, firewall, or the pantry's `mcp` container is down.
If (a) works but (b) returns `401 unauthorised`: the bearer token is wrong or
missing.

---

## 3. Register the server in Hermes

Hermes connects as an **MCP client over Streamable HTTP**. The exact UI/config
varies, but every MCP client needs the same three things: the **URL**, the
**transport type (HTTP/streamable-http)**, and the **auth header**. Use whichever
of the forms below matches how Hermes is configured.

### Form A — JSON config (most common)

Many MCP clients use an `mcpServers` map. Add:

```json
{
  "mcpServers": {
    "pantry-tracker": {
      "type": "streamable-http",
      "url": "http://<PANTRY_HOST_IP>:3001/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_AUTH_TOKEN>"
      }
    }
  }
}
```

Notes:
- Some clients name the field `"transport"` instead of `"type"`, and some accept
  `"http"` instead of `"streamable-http"`. Use what Hermes documents.
- If no `MCP_AUTH_TOKEN` was set, drop the whole `"headers"` block.

### Form B — UI "Add MCP server" dialog

If Hermes has a settings screen, enter:
- **Name:** `pantry-tracker`
- **Type / Transport:** Streamable HTTP (or HTTP)
- **URL:** `http://<PANTRY_HOST_IP>:3001/mcp`
- **Header:** key `Authorization`, value `Bearer <MCP_AUTH_TOKEN>`

### Form C — SDK / programmatic

If Hermes is wired up in code, construct a Streamable HTTP client transport
pointed at the URL with the `Authorization` header, then register/connect it as a
tool source. Pseudocode:

```
transport = StreamableHTTPClientTransport(
    url     = "http://<PANTRY_HOST_IP>:3001/mcp",
    headers = { "Authorization": "Bearer <MCP_AUTH_TOKEN>" },
)
client.connect(transport)   # tools/list will return the 9 pantry tools
```

After registering, **restart/reload Hermes** if it only reads MCP config at
startup.

---

## 4. The tools Hermes will gain

Once connected, `tools/list` exposes nine tools:

| Tool | Does |
|---|---|
| `list_inventory` | List all items (id, name, brand, category, quantity, low/expiry flags) |
| `get_item` | Full detail for one item (nutrition, ingredients, allergens, barcodes) |
| `add_item` | Create an item (starts at quantity 0) |
| `edit_item` | Edit item fields |
| `remove_item` | Archive an item (removes from inventory) |
| `adjust_stock` | Change stock by a delta (−1 used, +1 bought) |
| `list_shopping` | Read the shopping list |
| `add_shopping` | Add a free-text item to the shopping list |
| `tick_shopping` | Mark a shopping item done — the only way to clear it (no delete) |

## 5. Recommended system prompt for the agent

Add this to Hermes's system prompt / instructions so it uses the tools correctly:

> You manage a household pantry through MCP tools. To answer "do we have X?",
> call `list_inventory` and match by name — item ids come from there, never guess
> them. New items start at quantity 0; after `add_item`, call `adjust_stock` to
> set stock. Quantities change only via `adjust_stock` (delta −1 = used, +1 =
> bought). To clear a shopping-list item, call `tick_shopping` with
> `ticked: true` — there is no delete.

## 6. Confirm it works end to end

Ask Hermes:
1. **"Do we have any pineapple?"** → it should call `list_inventory`, match the
   name, and report the quantity.
2. **"Add toilet paper to the shopping list."** → it should call `add_shopping`
   and confirm.
3. **"Mark milk as used."** → `list_inventory` to find the id, then
   `adjust_stock` with `delta: -1`.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `curl /health` hangs or refuses | Wrong IP/port, firewall between boxes, or the pantry `mcp` container is down. Ask the pantry operator. |
| `401 unauthorised` | `MCP_AUTH_TOKEN` missing or wrong in the header. Copy it exactly; keep the `Bearer ` prefix. |
| Handshake works in curl but Hermes shows no tools | Transport type mismatch — make sure it's set to Streamable HTTP/`http`, not stdio or SSE. Reload Hermes after config changes. |
| Tools appear but every call errors | The pantry's device token (server side) may be revoked/expired — the pantry operator re-mints it in Settings → Device & API tokens. |
| Agent invents item ids and calls fail | Reinforce the system prompt in §5 — it must `list_inventory` first to get real ids. |

If you can complete §2 but not §3, the problem is in Hermes's MCP client config,
not the pantry — capture the exact config form Hermes uses and share it with the
pantry operator.
