import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { RconClient } from "./rcon/index.js";
import * as tools from "./tools/index.js";

const MC_RCON_HOST = process.env.MC_RCON_HOST || "127.0.0.1";
const MC_RCON_PORT = parseInt(process.env.MC_RCON_PORT || "25575", 10);
const MC_RCON_PASSWORD = process.env.MC_RCON_PASSWORD || "";
const MC_DEFAULT_OP = process.env.MC_DEFAULT_OP || "";

if (!MC_RCON_PASSWORD) {
  console.error("Error: MC_RCON_PASSWORD environment variable is required");
  process.exit(1);
}

const rcon = new RconClient(MC_RCON_HOST, MC_RCON_PORT, MC_RCON_PASSWORD);
let connectionError: string | null = null;

async function ensureConnected(): Promise<void> {
  if (rcon.isConnected()) {
    connectionError = null;
    return;
  }

  try {
    await rcon.connect();
    connectionError = null;
    console.error(`Connected to RCON server at ${MC_RCON_HOST}:${MC_RCON_PORT}`);
  } catch (err) {
    connectionError = err instanceof Error ? err.message : String(err);
    throw new Error(`RCON connection failed: ${connectionError}`);
  }
}

async function checkConnection(): Promise<string> {
  if (rcon.isConnected()) {
    return `Connected to ${MC_RCON_HOST}:${MC_RCON_PORT}`;
  }
  if (connectionError) {
    return `Disconnected. Last error: ${connectionError}`;
  }
  return "Not connected. Try calling a tool to connect.";
}

const server = new Server(
  {
    name: "mc-rcon",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mc_execute_command",
        description: "Execute a Minecraft command on the server via RCON",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The command to execute (without leading slash)",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "mc_list_players",
        description: "List all online players on the server",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "mc_get_server_info",
        description: "Get server information (TPS, version)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "mc_whitelist_add",
        description: "Add a player to the server whitelist",
        inputSchema: {
          type: "object",
          properties: {
            player: {
              type: "string",
              description: "The player name to whitelist",
            },
          },
          required: ["player"],
        },
      },
      {
        name: "mc_whitelist_remove",
        description: "Remove a player from the server whitelist",
        inputSchema: {
          type: "object",
          properties: {
            player: {
              type: "string",
              description: "The player name to remove from whitelist",
            },
          },
          required: ["player"],
        },
      },
      {
        name: "mc_op",
        description: "Give a player operator status",
        inputSchema: {
          type: "object",
          properties: {
            player: {
              type: "string",
              description: "The player name to make an operator",
            },
          },
          required: ["player"],
        },
      },
      {
        name: "mc_deop",
        description: "Remove operator status from a player",
        inputSchema: {
          type: "object",
          properties: {
            player: {
              type: "string",
              description: "The player name to remove operator status",
            },
          },
          required: ["player"],
        },
      },
      {
        name: "mc_check_connection",
        description: "Check RCON connection status",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "mc_execute_as_op",
        description: "Execute a command as an online operator. Automatically selects an online op if only one exists, otherwise requires specifying which op to use.",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The command to execute (without leading slash)",
            },
            op: {
              type: "string",
              description: "Optional: specific operator name to execute as. If not provided, uses MC_DEFAULT_OP env var or auto-selects if only one op online.",
            },
          },
          required: ["command"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const ctx = { rcon };
  const { name, arguments: args } = request.params;

  if (!args) {
    return { content: [{ type: "text" as const, text: "Error: No arguments provided" }], isError: true };
  }

  try {
    switch (name) {
      case "mc_check_connection":
        return {
          content: [{ type: "text" as const, text: await checkConnection() }],
        };
      case "mc_execute_as_op":
        await ensureConnected();
        return tools.executeAsOp(ctx, {
          command: String(args.command),
          op: args.op ? String(args.op) : undefined,
          defaultOp: MC_DEFAULT_OP || undefined,
        });
      case "mc_execute_command":
        await ensureConnected();
        return tools.executeCommand(ctx, String(args.command));
      case "mc_list_players":
        await ensureConnected();
        return tools.listPlayers(ctx);
      case "mc_get_server_info":
        await ensureConnected();
        return tools.getServerInfo(ctx);
      case "mc_whitelist_add":
        await ensureConnected();
        return tools.whitelistAdd(ctx, String(args.player));
      case "mc_whitelist_remove":
        await ensureConnected();
        return tools.whitelistRemove(ctx, String(args.player));
      case "mc_op":
        await ensureConnected();
        return tools.opPlayer(ctx, String(args.player));
      case "mc_deop":
        await ensureConnected();
        return tools.deopPlayer(ctx, String(args.player));
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});
