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
