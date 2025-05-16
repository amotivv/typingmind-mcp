# MCP Servers

This directory contains MCP (Model Context Protocol) servers that can be run with the TypingMind MCP Connector.

## Available Servers

### GPT Model Comparison

Located in the `model-comparison` directory, this MCP server provides tools for comparing and selecting optimal GPT models based on task requirements and cost considerations.

**Features:**
- Get optimal model recommendations based on task type, context length, and budget
- Estimate costs for text inputs across different models
- Compare models side-by-side on various aspects

See the [README](./model-comparison/README.md) for more details.

## Running Servers with the MCP Connector

The MCP servers in this directory are configured to run with the TypingMind MCP Connector using Docker Compose. 

To run the servers:

1. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```

2. Register each MCP server with the connector:
   ```bash
   ./register-mcp-server.sh
   ```

3. Test the API endpoints:
   ```bash
   ./test-api.sh
   ```

## Adding New MCP Servers

To add a new MCP server:

1. Create a new directory in `mcp-servers/` for your server
2. Create the necessary files (package.json, Dockerfile, src/, etc.)
3. Add the server to the `docker-compose.yml` file
4. Update the `register-mcp-server.sh` script to register your server with the connector