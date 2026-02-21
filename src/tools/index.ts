import { RconClient } from "../rcon/index.js";

export interface ToolContext {
  rcon: RconClient;
}

export async function executeCommand(ctx: ToolContext, command: string) {
  const result = await ctx.rcon.send(command);
  return {
    content: [
      {
        type: "text" as const,
        text: result || "(empty response)",
      },
    ],
  };
}

export async function listPlayers(ctx: ToolContext) {
  const result = await ctx.rcon.send("list");
  const match = result.match(/There are (\d+) of a max of (\d+) players online:(.*)/);

  if (!match) {
    return {
      content: [
        {
          type: "text" as const,
          text: result || "Failed to parse player list",
        },
      ],
    };
  }

  const [, online, max, playersStr] = match;
  const players = playersStr.trim()
    ? playersStr.trim().split(", ").filter(Boolean)
    : [];

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ online: Number(online), max: Number(max), players }, null, 2),
      },
    ],
  };
}

export async function getServerInfo(ctx: ToolContext) {
  const [tps, version] = await Promise.all([
    ctx.rcon.send("tps"),
    ctx.rcon.send("version"),
  ]);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ tps, version }, null, 2),
      },
    ],
  };
}

export async function whitelistAdd(ctx: ToolContext, player: string) {
  const result = await ctx.rcon.send(`whitelist add ${player}`);
  return {
    content: [{ type: "text" as const, text: result || "Done" }],
  };
}

export async function whitelistRemove(ctx: ToolContext, player: string) {
  const result = await ctx.rcon.send(`whitelist remove ${player}`);
  return {
    content: [{ type: "text" as const, text: result || "Done" }],
  };
}

export async function opPlayer(ctx: ToolContext, player: string) {
  const result = await ctx.rcon.send(`op ${player}`);
  return {
    content: [{ type: "text" as const, text: result || "Done" }],
  };
}

export async function deopPlayer(ctx: ToolContext, player: string) {
  const result = await ctx.rcon.send(`deop ${player}`);
  return {
    content: [{ type: "text" as const, text: result || "Done" }],
  };
}

export async function getOnlineOps(ctx: ToolContext): Promise<string[]> {
  const listResult = await ctx.rcon.send("list");
  const match = listResult.match(/There are \d+ of a max of \d+ players online:(.*)/);
  if (!match || !match[1].trim()) {
    return [];
  }

  const players = match[1].trim().split(", ").filter(Boolean);
  const ops: string[] = [];

  for (const player of players) {
    const checkResult = await ctx.rcon.send(
      `execute if entity @a[name=${player},operator=true]`
    );
    if (checkResult.includes("Successfully") || !checkResult.includes("no entities")) {
      ops.push(player);
    }
  }

  return ops;
}

export interface ExecuteAsOpOptions {
  command: string;
  op?: string;
  defaultOp?: string;
}

export async function executeAsOp(ctx: ToolContext, options: ExecuteAsOpOptions) {
  const { command, op, defaultOp } = options;

  let selectedOp = op || defaultOp;

  if (!selectedOp) {
    const onlineOps = await getOnlineOps(ctx);

    if (onlineOps.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: No online operators found. Please wait for an operator to come online.",
          },
        ],
        isError: true,
      };
    }

    if (onlineOps.length === 1) {
      selectedOp = onlineOps[0];
    } else {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Multiple online operators found: ${onlineOps.join(", ")}. Please specify which operator to use with the 'op' parameter or set MC_DEFAULT_OP environment variable.`,
          },
        ],
        isError: true,
      };
    }
  }

  const result = await ctx.rcon.send(`execute as ${selectedOp} run ${command}`);
  return {
    content: [{ type: "text" as const, text: result || "(empty response)" }],
  };
}
