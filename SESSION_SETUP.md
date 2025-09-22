# 🎯 Session Management Setup Guide

## 🗄️ Database Setup

### 1. Run SQL Schema in Supabase

Copy the contents of `mcp-backend/schema.sql` and run it in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Paste the schema.sql content
5. Run the query to create tables

### 2. Enable Row Level Security (RLS)

In your Supabase dashboard, go to **Authentication** → **Policies** and add:

```sql
-- Enable RLS on all session tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON sessions 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON sessions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions 
FOR UPDATE USING (auth.uid() = user_id);

-- Messages policy
CREATE POLICY "Users can view own messages" ON messages 
FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM sessions WHERE sessions.id = messages.session_id)
);

CREATE POLICY "Users can create messages" ON messages 
FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM sessions WHERE sessions.id = messages.session_id)
);

-- Tool calls policy
CREATE POLICY "Users can view own tool calls" ON tool_calls 
FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM sessions WHERE sessions.id = tool_calls.session_id)
);

CREATE POLICY "Users can create tool calls" ON tool_calls 
FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM sessions WHERE sessions.id = tool_calls.session_id)
);
```

## 🚀 Features Now Available

### ✅ **Multi-Turn Conversations**
- AI remembers conversation context
- Follow-up questions work naturally
- Example: "What meetings today?" → "What about tomorrow?"

### ✅ **Session Management**
- **Sessions Button**: View all conversation history
- **New Chat Button**: Start fresh conversations
- **Auto-Save**: Messages stored automatically
- **Session Titles**: Auto-generated from first message

### ✅ **Persistent Memory**
- Conversations survive app restarts
- Context maintained across sessions
- Tool calls logged for debugging

### ✅ **Enhanced AI Processing**
- Session-aware responses
- Contextual tool selection  
- Natural language understanding

## 🎮 How to Use

### 1. **Starting a New Chat**
- Tap the **"+"** button to create a new session
- First message automatically creates a session
- Session title generated from your first message

### 2. **Viewing Chat History** 
- Tap **"Sessions"** button to see all conversations
- Tap any session to load its history
- Delete sessions by tapping the trash icon

### 3. **Natural Conversations**
```
You: "What meetings do I have today?"
AI: "You have 3 meetings today. Your next one is..."

You: "What about tomorrow?" 
AI: "Following up on your question about today's meetings, tomorrow you have..."
```

### 4. **Commands Still Work**
- `/connect` - Link Google Workspace
- `/calendar` - Get today's events
- `/emails` - Check recent messages
- `/help` - See all commands

## 🧠 AI Memory Features

The AI now has **conversation context** and will:
- Reference previous messages
- Understand follow-up questions
- Maintain consistency across the session
- Provide contextual responses

### Example Conversation Flow:
```
User: "What meetings do I have today?"
Assistant: [Calls getTodaysEvents] "You have 3 meetings today..."

User: "What about tomorrow?"
Assistant: [Uses context, calls getTodaysEvents for tomorrow] 
"Following up on your earlier question about today, tomorrow you have..."

User: "Reschedule the 2 PM meeting"
Assistant: [Understands which meeting based on context]
```

## 🔧 Backend API Endpoints

### Session Management
- `POST /api/sessions` - Create session
- `GET /api/sessions` - List user sessions
- `GET /api/sessions/:id` - Get session details
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

### Messages
- `GET /api/sessions/:id/messages` - Get conversation history
- `POST /api/sessions/:id/messages` - Add message to session

### AI Processing
- `POST /api/ai/query` - Process queries (with optional sessionId for context)

## 🎯 Example Multi-Turn Flow

1. **User starts new session**: Auto-creates in background
2. **First query**: "What meetings do I have today?"
   - AI calls `getTodaysEvents`
   - Stores conversation in database
3. **Follow-up**: "What about tomorrow?"
   - AI retrieves conversation context
   - Understands "tomorrow" refers to calendar
   - Provides contextual response
4. **Later**: User reopens app, sees session in history
   - Can continue conversation with full context

🎉 **Your AI assistant now has memory and can handle complex multi-turn conversations!**