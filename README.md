# mc-rcon-mcp

Minecraft RCON MCP Server for OpenCode

## Features

- Execute Minecraft commands via RCON
- List online players
- Get server info (TPS, version)
- Whitelist management
- Operator management

## Setup

1. Clone and install dependencies:
```bash
npm install
npm run build
```

2. Configure your Minecraft server RCON:
```properties
# server.properties
rcon.port=25575
rcon.password=your_password
enable-rcon=true
```

3. Add to OpenCode config (`~/.config/opencode/opencode.json`):
```json
{
  "mcp": {
    "mc-rcon": {
      "type": "local",
      "command": ["node", "/path/to/mc-rcon-mcp/dist/index.js"],
      "enabled": true,
      "environment": {
        "MC_RCON_HOST": "127.0.0.1",
        "MC_RCON_PORT": "25575",
        "MC_RCON_PASSWORD": "your_password"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `mc_execute_command` | Execute a Minecraft command |
| `mc_list_players` | List online players |
| `mc_get_server_info` | Get server TPS and version |
| `mc_whitelist_add` | Add player to whitelist |
| `mc_whitelist_remove` | Remove player from whitelist |
| `mc_op` | Give player operator status |
| `mc_deop` | Remove player operator status |
| `mc_check_connection` | Check RCON connection status |

## Usage

```
list server players use mc-rcon
```

or

```
execute command "give @p diamond 1" use mc-rcon
```
