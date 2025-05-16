#!/bin/bash

# Get AUTH_TOKEN from .env file or use provided argument
if [ -f .env ]; then
  source .env
fi
AUTH_TOKEN=${1:-$MCP_AUTH_TOKEN}

if [ -z "$AUTH_TOKEN" ]; then
  echo "Error: Authentication token is required"
  echo "Usage: ./register-mcp-server.sh <auth-token>"
  echo "   OR set MCP_AUTH_TOKEN in .env file"
  exit 1
fi

# Base URL for the MCP Connector API
BASE_URL="http://localhost:12757"

# Wait for the MCP Connector to be ready
echo "Waiting for MCP Connector to be ready..."
until curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $AUTH_TOKEN" $BASE_URL/ping | grep -q "200"; do
  echo "MCP Connector not ready yet. Retrying in 3 seconds..."
  sleep 3
done

echo "MCP Connector is ready! Registering GPT Model Comparison MCP server..."

# Register the GPT Model Comparison MCP server
curl -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- $BASE_URL/start << EOF
{
  "mcpServers": {
    "gpt-model-comparison": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "http://gpt-model-comparison-mcp:3000/mcp",
        "-H", "Content-Type: application/json",
        "-d", "{}"
      ],
      "env": {}
    }
  }
}
EOF

echo -e "\n\nTo test the MCP server, use the following command:"
echo "./test-api.sh"