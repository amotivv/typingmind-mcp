# GPT Model Comparison MCP Server

This MCP server provides tools for comparing and selecting optimal GPT models based on task requirements and cost considerations.

## Features

- Get optimal model recommendations based on task type, context length, and budget
- Estimate costs for text inputs across different models
- Compare models side-by-side on various aspects
- Get detailed information about specific models
- List and categorize available models

## Tools

1. **get_optimal_model** - Get the optimal model based on task requirements
2. **estimate_text_cost** - Analyze text to estimate costs across models
3. **get_model_details** - Get comprehensive information about a specific model
4. **compare_models** - Compare multiple models side-by-side
5. **list_models** - Get a complete list of all available models with optional categorization

## Running Standalone

To run the MCP server standalone (outside of Docker):

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm start
```

## Running with Docker

The server is designed to run in a Docker container as part of the TypingMind MCP Connector setup:

```bash
# From the parent directory (typingmind-mcp)
docker-compose up -d
```

## Testing

You can test the server using the TypingMind MCP Connector:

1. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```

2. Register the MCP server with the connector:
   ```bash
   ./register-mcp-server.sh
   ```

3. Test the API endpoints:
   ```bash
   ./test-api.sh
   ```

## API

The MCP server exposes a standard MCP HTTP endpoint at `/mcp`, which can be used with any MCP client.