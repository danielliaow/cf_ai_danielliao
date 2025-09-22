# MCP Orchestrator Backend

A Node.js/TypeScript backend that provides MCP (Model Context Protocol) tools for Google Workspace integration with Supabase authentication.

## Features

- 🔐 **Supabase Authentication** - JWT token verification
- 🔑 **Google OAuth2** - Workspace integration (Calendar + Gmail)
- 🛠️ **Extensible MCP Tools** - Easy to add new tools
- 📅 **Calendar Integration** - Fetch today's events with summaries
- 📧 **Gmail Integration** - Fetch last 10 emails with summaries
- 🔒 **Protected Routes** - Authentication and rate limiting
- 📊 **Structured Responses** - Consistent JSON API
- 🚀 **Production Ready** - Security middleware and error handling

## Quick Start

### 1. Setup Environment

```bash
cd mcp-backend
cp .env.example .env
# Edit .env with your credentials
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase Database

Run the SQL script in your Supabase SQL editor:

```bash
# Copy contents of scripts/setup-database.sql and run in Supabase
```

### 4. Configure Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Calendar API and Gmail API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3001/auth/google/callback`

### 5. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Authentication

- `GET /api/auth/google` - Get Google authorization URL
- `GET /api/auth/google/callback` - Handle OAuth callback (requires auth)
- `GET /api/auth/status` - Get authentication status (requires auth)
- `POST /api/auth/google/revoke` - Revoke Google access (requires auth)

### MCP Tools

- `GET /api/mcp/tools` - List available tools (requires auth)
- `GET /api/mcp/tools/:toolName` - Get tool details (requires auth)
- `POST /api/mcp/tools/:toolName/execute` - Execute tool (requires auth + Google)

### Utility

- `GET /api/health` - Health check
- `GET /api` - API information

## MCP Tools

### getTodaysEvents

Fetches today's calendar events from Google Calendar.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event123",
        "summary": "Team Meeting",
        "description": "Weekly team sync",
        "start": {
          "dateTime": "2024-01-15T09:00:00-08:00",
          "timeZone": "America/Los_Angeles"
        },
        "end": {
          "dateTime": "2024-01-15T10:00:00-08:00",
          "timeZone": "America/Los_Angeles"
        },
        "location": "Conference Room A",
        "attendees": [
          {
            "email": "colleague@company.com",
            "displayName": "John Doe",
            "responseStatus": "accepted"
          }
        ]
      }
    ],
    "summary": {
      "total": 5,
      "upcoming": 3,
      "byTime": {
        "morning": 2,
        "afternoon": 2,
        "evening": 1
      }
    },
    "date": "2024-01-15"
  },
  "timestamp": "2024-01-15T08:00:00.000Z"
}
```

### getLastTenMails

Fetches the last 10 Gmail messages with summaries.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg123",
        "threadId": "thread123",
        "subject": "Project Update",
        "from": "John Doe <john@company.com>",
        "to": ["you@company.com"],
        "date": "Mon, 15 Jan 2024 09:30:00 -0800",
        "snippet": "Here's the latest update on our project...",
        "body": "Here's the latest update on our project. We've completed the first phase and are moving into testing...",
        "unread": true
      }
    ],
    "summary": {
      "total": 10,
      "unread": 3,
      "senders": ["john@company.com", "jane@partner.com"],
      "todayCount": 5
    },
    "fetchedAt": "2024-01-15T17:30:00.000Z"
  },
  "timestamp": "2024-01-15T17:30:00.000Z"
}
```

## Testing

### Run API Tests

```bash
# Start the server first
npm run dev

# In another terminal, run tests
node scripts/test-api.js
```

### Manual Testing with curl

```bash
# Health check
curl http://localhost:3001/api/health

# Get Google auth URL
curl http://localhost:3001/api/auth/google

# List tools (requires auth token)
curl -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
     http://localhost:3001/api/mcp/tools

# Execute tool (requires auth + Google connection)
curl -X POST \
     -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"params": {}}' \
     http://localhost:3001/api/mcp/tools/getTodaysEvents/execute
```

## Adding New MCP Tools

### 1. Create Tool Definition

```typescript
// src/services/tools/myNewTool.ts
import { MCPTool, MCPToolResponse } from '../../types';

export const myNewToolDefinition: MCPTool = {
  name: 'myNewTool',
  description: 'Description of what this tool does',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      // Your tool implementation here
      return {
        success: true,
        data: { result: 'Tool executed successfully' },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  },
};
```

### 2. Register the Tool

```typescript
// src/services/tools/index.ts
import { myNewToolDefinition } from './myNewTool';

export function registerAllTools() {
  MCPToolRegistry.registerTool(getTodaysEventsToolDefinition);
  MCPToolRegistry.registerTool(getLastTenMailsToolDefinition);
  MCPToolRegistry.registerTool(myNewToolDefinition); // Add this line
}
```

### 3. Use the Tool

```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"params": {}}' \
     http://localhost:3001/api/mcp/tools/myNewTool/execute
```

## Project Structure

```
mcp-backend/
├── src/
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Auth & other middleware
│   ├── routes/            # Route definitions
│   ├── services/          # Business logic
│   │   └── tools/         # MCP tool implementations
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── scripts/               # Setup and test scripts
└── dist/                  # Compiled JavaScript (generated)
```

## Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Optional
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Security Features

- 🔒 Helmet.js security headers
- 🚫 CORS protection
- 🎯 Rate limiting (10 requests/minute for MCP tools)
- 🔐 JWT token verification
- 👤 User-specific data isolation
- 🛡️ Supabase Row Level Security (RLS)

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Use HTTPS endpoints
3. Configure proper CORS origins
4. Set up monitoring and logging
5. Use environment-specific database

## Troubleshooting

### Common Issues

1. **"Missing required environment variable"**
   - Copy `.env.example` to `.env` and fill in values

2. **"Google Workspace authorization required"**
   - User needs to complete OAuth flow via `/api/auth/google`

3. **"Invalid or expired token"**
   - Frontend needs to refresh Supabase session

4. **Tool execution fails**
   - Check Google API quotas and permissions
   - Verify OAuth scopes are correct

### Debug Mode

```bash
NODE_ENV=development npm run dev
```

This enables detailed error messages and request logging.