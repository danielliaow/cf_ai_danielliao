# MCP Multi-Server Setup Guide

## Quick Start: Adding External MCP Servers

This guide shows you how to connect additional MCP servers running on different ports to expand your AI assistant's capabilities.

## Prerequisites

- Your main SupabaseAuthApp backend running on port 3001
- An external MCP server running on a different port (e.g., 8080, 9000, etc.)

## Step 1: Start Your External MCP Server

Make sure your external MCP server is running and exposes these endpoints:
- `GET /health` - Health check
- `GET /tools` - List available tools
- `POST /execute` - Execute tools

Example external server response for `/tools`:
```json
{
  "tools": [
    {
      "name": "customTool",
      "description": "My custom tool",
      "parameters": {
        "param1": {
          "type": "string",
          "description": "First parameter",
          "required": true
        }
      },
      "category": "custom",
      "examples": [
        {
          "query": "Use my custom tool",
          "expectedParams": { "param1": "example" },
          "description": "Example usage"
        }
      ]
    }
  ]
}
```

## Step 2: Add External Server via API

### Using cURL:
```bash
curl -X POST http://localhost:3001/api/external-mcp/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Tools",
    "host": "localhost",
    "port": 8080,
    "protocol": "http",
    "description": "Custom productivity tools",
    "apiKey": "optional-secret-key"
  }'
```

### Using JavaScript/fetch:
```javascript
const response = await fetch('http://localhost:3001/api/external-mcp/servers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My Custom Tools',
    host: 'localhost',
    port: 8080,
    protocol: 'http',
    description: 'Custom productivity tools',
    apiKey: 'optional-secret-key' // Only if your server requires authentication
  })
});

const result = await response.json();
console.log('Server added:', result.serverId);
```

## Step 3: Verify Connection

Check that your server was added successfully:

```bash
# Get all external servers
curl http://localhost:3001/api/external-mcp/servers

# Get comprehensive stats
curl http://localhost:3001/api/external-mcp/stats
```

Expected response:
```json
{
  "success": true,
  "stats": {
    "internal": {
      "totalServers": 1,
      "enabledServers": 1,
      "totalTools": 5,
      "toolsByCategory": {
        "calendar": 2,
        "email": 2,
        "web": 1
      }
    },
    "external": {
      "totalServers": 1,
      "connectedServers": 1,
      "disconnectedServers": 0,
      "errorServers": 0
    },
    "combined": {
      "totalTools": 6,
      "totalServers": 2
    }
  }
}
```

## Step 4: Test Your Tools

Your external tools are now available in the chat interface! They'll be prefixed with your server name.

Example: If you added a server named "My Custom Tools" with a tool called "customTool", it will be available as "My Custom Tools_customTool".

Try asking in the chat:
- "Use my custom tool with parameter example"
- "What tools are available?"
- "Help me with custom functionality"

## Configuration Options

### Full Configuration Object:
```json
{
  "name": "Required: Server display name",
  "host": "Required: Server hostname (e.g., localhost, 192.168.1.100)",
  "port": "Required: Server port number (1-65535)",
  "protocol": "Optional: 'http' or 'https' (default: http)",
  "apiKey": "Optional: Bearer token for authentication",
  "description": "Optional: Server description",
  "healthCheckEndpoint": "Optional: Health check path (default: /health)",
  "toolsEndpoint": "Optional: Tools list path (default: /tools)",
  "executeEndpoint": "Optional: Tool execution path (default: /execute)"
}
```

## Managing External Servers

### Disable/Enable a Server:
```bash
curl -X PATCH http://localhost:3001/api/external-mcp/servers/{serverId} \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Remove a Server:
```bash
curl -X DELETE http://localhost:3001/api/external-mcp/servers/{serverId}
```

### Test Connection Before Adding:
```bash
curl -X POST http://localhost:3001/api/external-mcp/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 8080,
    "protocol": "http"
  }'
```

## Troubleshooting

### Common Issues:

1. **Server Not Connecting**
   - Check if the external server is running
   - Verify firewall/network settings
   - Ensure correct host and port

2. **Tools Not Appearing**
   - Check that `/tools` endpoint returns valid JSON
   - Verify tool format matches expected schema
   - Check server logs for errors

3. **Authentication Errors**
   - Verify API key if using authentication
   - Check that external server accepts Bearer tokens

### Debug Commands:

```bash
# Check server status
curl http://localhost:3001/api/external-mcp/servers/{serverId}

# Get tools from specific server
curl http://localhost:3001/api/external-mcp/servers/{serverId}/tools

# Check backend logs
# Look for messages like:
# 🔌 Added external MCP server: ...
# ✅ Registered server ... with X tools
# ⚠️ Health check failed for ...
```

## Example External Server Implementation

Here's a minimal Node.js example of an external MCP server:

```javascript
const express = require('express');
const app = express();
const PORT = 8080;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// List tools
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'greetUser',
        description: 'Greet a user with a custom message',
        parameters: {
          username: {
            type: 'string',
            description: 'Username to greet',
            required: true
          }
        },
        category: 'social',
        examples: [
          {
            query: 'Greet John',
            expectedParams: { username: 'John' },
            description: 'Greet user John'
          }
        ]
      }
    ]
  });
});

// Execute tool
app.post('/execute', (req, res) => {
  const { tool, userId, params } = req.body;
  
  if (tool === 'greetUser') {
    const username = params.username || 'Anonymous';
    res.json({
      success: true,
      result: `Hello, ${username}! Nice to meet you!`
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Tool not found'
    });
  }
});

app.listen(PORT, () => {
  console.log(`External MCP server running on port ${PORT}`);
});
```

## Best Practices

1. **Naming**: Use descriptive server names that reflect their purpose
2. **Security**: Use HTTPS in production and implement proper API key authentication
3. **Error Handling**: Implement robust error handling in your external server
4. **Monitoring**: Monitor health status and connection reliability
5. **Documentation**: Document your custom tools clearly for users

## Support

If you encounter issues:
1. Check the backend logs for error messages
2. Verify your external server is responding correctly
3. Test the connection using the test endpoint
4. Ensure all required fields are provided in the configuration

Your external MCP tools will now be seamlessly integrated into the AI assistant and available for natural language interactions!