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

if (!MC_RCON_PASSWORD) {
  console.error("Error: MC_RCON_PASSWORD environment variable is required");
  process.exit(1);
}

const rcon = new RconClient(MC_RCON_HOST, MC_RCON_PORT, MC_RCON_PASSWORD);

async function connectRcon() {
  try {
    await rcon.connect();
    console.error(`Connected to RCON server at ${MC_RCON_HOST}:${MC_RCON_PORT}`);
  } catch (err) {
    console.error(`Failed to connect to RCON server: ${err}`);
    process.exit(1);
  }
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
      case "mc_execute_command":
        return tools.executeCommand(ctx, String(args.command));
      case "mc_list_players":
        return tools.listPlayers(ctx);
      case "mc_get_server_info":
        return tools.getServerInfo(ctx);
      case "mc_whitelist_add":
        return tools.whitelistAdd(ctx, String(args.player));
      case "mc_whitelist_remove":
        return tools.whitelistRemove(ctx, String(args.player));
      case "mc_op":
        return tools.opPlayer(ctx, String(args.player));
      case "mc_deop":
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
  await connectRcon();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});
