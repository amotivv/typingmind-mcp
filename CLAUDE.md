# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Security Considerations

The MCP Connector implements several security measures:

1. **Input Validation**: All API inputs are validated for format and content.
2. **Command Sanitization**: Command arguments are sanitized to prevent injection attacks.
3. **Authentication**: All endpoints require token-based authentication.
4. **Error Handling**: Error responses are sanitized to prevent information disclosure.

When making changes to this codebase, please maintain these security practices:

- Always validate and sanitize user inputs
- Don't expose sensitive error details in API responses
- Maintain the authentication middleware on all new endpoints
- Use the validation middleware for any new routes

## Project Overview

TypingMind MCP Connector is a lightweight server that runs and manages multiple Model Context Protocol (MCP) servers. It's designed to integrate with TypingMind (https://www.typingmind.com/mcp), providing a simple REST API to connect custom AI models or tools with the TypingMind platform.

## Development Commands

```bash
# Install dependencies
npm install

# Start the server (development)
npm start -- <auth-token>
# OR
MCP_AUTH_TOKEN=<auth-token> npm start

# Run with HTTPS
CERTFILE=./path/to/certificate.crt KEYFILE=./path/to/privatekey.key npm start -- <auth-token>

# Format code
npx prettier --write .
```

## Project Architecture

The MCP Connector follows a simple architecture:

1. **Server Setup**: The main Express server is set up in `lib/server.js` with authentication middleware and API endpoints.

2. **Client Management**: The server manages multiple MCP clients, each connecting to an external MCP provider. These clients are stored in a Map with unique IDs.

3. **API Endpoints**: The server exposes RESTful endpoints to start, list, restart, and delete clients, as well as to list and call their tools.

4. **Authentication**: All API endpoints are protected with Bearer token authentication, implemented in `lib/auth.js`.

5. **Port Management**: The server automatically finds an available port (defaults to 50880 or 50881) using the utility in `lib/port-finder.js`.

## Key Components

1. **Server (lib/server.js)**: The core server implementation that exposes the API endpoints and manages the clients.

2. **Authentication (lib/auth.js)**: Middleware for validating Bearer token authentication.

3. **Port Finder (lib/port-finder.js)**: Utility to find available ports for the server.

4. **Entry Point (bin/index.js)**: CLI entry point that initializes the server with authentication token.

## API Endpoints

- **GET /ping**: Health check endpoint
- **POST /start**: Start one or more MCP clients
- **POST /restart/:id**: Restart a specific client
- **GET /clients**: List all running MCP clients
- **GET /clients/:id**: Get information about a specific client
- **GET /clients/:id/tools**: List available tools for a client
- **POST /clients/:id/call_tools**: Call a tool for a client
- **DELETE /clients/:id**: Stop and delete a client

All endpoints require an `Authorization: Bearer <auth-token>` header.