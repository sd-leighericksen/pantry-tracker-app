/* ------------------------------------------------------------------ *
 * Pantry Tracker MCP server — tool definitions.
 *
 * Wraps the REST API (app/api/v1) as MCP tools so an LLM agent (Hermes)
 * can read and modify the pantry. Mirrors GET /api/v1 capability discovery.
 * Each tool is a one-to-one mapping onto a REST endpoint via lib pantry-client.
 * ------------------------------------------------------------------ */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { pantry } from "@/mcp/pantry-client";

/** Wrap any JSON result as MCP text content. */
function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function buildServer(): McpServer {
  const server = new McpServer({ name: "pantry-tracker", version: "1.0.0" });

  /* ---- Inventory ---- */

  server.registerTool(
    "list_inventory",
    {
      title: "List inventory",
      description:
        "List every pantry item with id, name, brand, category, quantity, " +
        "threshold, nutriscore, and low/expiry flags. Use this to answer " +
        "questions like 'do we have pineapple?' by matching on name.",
      inputSchema: {},
    },
    async () => ok(await pantry.listInventory()),
  );

  server.registerTool(
    "get_item",
    {
      title: "Get item detail",
      description:
        "Full detail for one item: size, nutriments (per 100g), ingredients, " +
        "allergens, and barcodes.",
      inputSchema: { id: z.number().int().describe("Item id from list_inventory") },
    },
    async ({ id }) => ok(await pantry.getItem(id)),
  );

  server.registerTool(
    "add_item",
    {
      title: "Add inventory item",
      description:
        "Create a pantry item. It starts at quantity 0 — call adjust_stock " +
        "afterwards to set how many are in stock.",
      inputSchema: {
        name: z.string().describe("Product name, e.g. 'Pineapple'"),
        category: z.string().optional().describe("Category name"),
        brand: z.string().optional(),
        size: z.string().optional().describe("e.g. '440g', '2L'"),
        threshold: z
          .number()
          .optional()
          .describe("Low-stock threshold; the list auto-adds the item below this"),
        notes: z.string().optional(),
      },
    },
    async (args) => ok(await pantry.createItem(args)),
  );

  server.registerTool(
    "edit_item",
    {
      title: "Edit inventory item",
      description: "Edit fields on an item (partial; merged over current values).",
      inputSchema: {
        id: z.number().int(),
        name: z.string().optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        size: z.string().optional(),
        threshold: z.number().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, ...rest }) => ok(await pantry.editItem(id, rest)),
  );

  server.registerTool(
    "remove_item",
    {
      title: "Remove inventory item",
      description: "Archive an item (removes it from inventory).",
      inputSchema: { id: z.number().int() },
    },
    async ({ id }) => ok(await pantry.removeItem(id)),
  );

  server.registerTool(
    "adjust_stock",
    {
      title: "Adjust stock",
      description:
        "Change an item's stock by a delta and write an auditable stock event. " +
        "delta -1 = used/consumed one, +1 = bought one. Quantity is never set " +
        "directly. Find the id with list_inventory first — never guess it.",
      inputSchema: {
        id: z.number().int(),
        delta: z.number().int().describe("Signed change, e.g. -1 or 2"),
      },
    },
    async ({ id, delta }) => ok(await pantry.adjustStock(id, delta)),
  );

  /* ---- Shopping list ---- */

  server.registerTool(
    "list_shopping",
    {
      title: "List shopping list",
      description: "Read the shopping list.",
      inputSchema: {},
    },
    async () => ok(await pantry.listShopping()),
  );

  server.registerTool(
    "add_shopping",
    {
      title: "Add to shopping list",
      description: "Add a free-text item to the shopping list, e.g. 'Toilet paper'.",
      inputSchema: {
        text: z.string().describe("What to buy"),
        storeId: z.number().int().optional().describe("Optional preferred store id"),
      },
    },
    async ({ text, storeId }) => ok(await pantry.addShopping(text, storeId)),
  );

  server.registerTool(
    "tick_shopping",
    {
      title: "Tick / clear shopping item",
      description:
        "Mark a shopping item purchased/done. This is the only way to clear an " +
        "item from the list — there is no delete. ticked=true completes it, " +
        "false restores it. Get the id from list_shopping.",
      inputSchema: {
        id: z.number().int().describe("Shopping list row id from list_shopping"),
        ticked: z.boolean(),
      },
    },
    async ({ id, ticked }) => ok(await pantry.tickShopping(id, ticked)),
  );

  return server;
}
