#!/bin/bash

# Get AUTH_TOKEN from .env file or use provided argument
if [ -f .env ]; then
  source .env
fi
AUTH_TOKEN=${1:-$MCP_AUTH_TOKEN}

if [ -z "$AUTH_TOKEN" ]; then
  echo "Error: Authentication token is required"
  echo "Usage: ./test-api.sh <auth-token>"
  echo "   OR set MCP_AUTH_TOKEN in .env file"
  exit 1
fi

# Base URL for the API
BASE_URL="http://localhost:12757"

# Test ping endpoint (health check)
echo "Testing ping endpoint..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" $BASE_URL/ping | jq

# Test clients endpoint (list clients)
echo ""
echo "Testing clients endpoint..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" $BASE_URL/clients | jq

# Test GPT Model Comparison MCP server (if registered)
echo ""
echo "Testing GPT Model Comparison MCP server..."

# Find the client ID for GPT Model Comparison
CLIENTS=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" $BASE_URL/clients)
GPT_MODEL_COMPARISON_ID=$(echo $CLIENTS | jq -r '.[] | select(.command=="curl") | .id')

if [ -z "$GPT_MODEL_COMPARISON_ID" ] || [ "$GPT_MODEL_COMPARISON_ID" == "null" ]; then
  echo "GPT Model Comparison MCP server not found. Register it first with ./register-mcp-server.sh"
else
  echo "Found GPT Model Comparison MCP server with ID: $GPT_MODEL_COMPARISON_ID"
  
  # Get available tools
  echo ""
  echo "Getting available tools..."
  curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
    "$BASE_URL/clients/$GPT_MODEL_COMPARISON_ID/tools" | jq
  
  # Test the get_optimal_model tool
  echo ""
  echo "Testing the get_optimal_model tool..."
  curl -s -X POST -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "get_optimal_model",
      "arguments": {
        "task_type": "code_generation",
        "context_length": 5000,
        "multimodal_required": false,
        "optimize_for": "cost"
      }
    }' \
    "$BASE_URL/clients/$GPT_MODEL_COMPARISON_ID/call_tools" | jq
fi