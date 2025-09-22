-- AI Assistant Session Management Schema
-- Compatible with Supabase/PostgreSQL

-- Enable Row Level Security
-- Note: RLS policies should be configured in Supabase dashboard

-- 1. Sessions Table
-- Stores conversation sessions for each user
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient user session lookups
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_active ON sessions(user_id, is_active, updated_at DESC);

-- 2. Messages Table  
-- Stores individual messages in conversations
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient message retrieval
CREATE INDEX idx_messages_session_id ON messages(session_id, created_at);
CREATE INDEX idx_messages_role ON messages(session_id, role, created_at);

-- 3. Tool Calls Table
-- Logs all MCP tool invocations for debugging and analytics
CREATE TABLE tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}',
    result JSONB,
    success BOOLEAN NOT NULL,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tool analytics and debugging
CREATE INDEX idx_tool_calls_session ON tool_calls(session_id, created_at);
CREATE INDEX idx_tool_calls_tool_name ON tool_calls(tool_name, created_at);
CREATE INDEX idx_tool_calls_success ON tool_calls(success, tool_name);

-- 4. Auto-update updated_at trigger for sessions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Function to auto-generate session titles based on first message
CREATE OR REPLACE FUNCTION generate_session_title(first_message TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Generate a smart title from the first message
    RETURN CASE 
        WHEN LENGTH(first_message) <= 50 THEN first_message
        ELSE LEFT(first_message, 47) || '...'
    END;
END;
$$ LANGUAGE plpgsql;

-- 6. Example RLS Policies (to be applied in Supabase dashboard)
-- Users can only access their own sessions
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can create own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id);

-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;  
-- CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
--     auth.uid() = (SELECT user_id FROM sessions WHERE sessions.id = messages.session_id)
-- );

-- ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own tool calls" ON tool_calls FOR SELECT USING (
--     auth.uid() = (SELECT user_id FROM sessions WHERE sessions.id = tool_calls.session_id)  
-- );

-- 7. Example Data Queries

-- Create a new session
-- INSERT INTO sessions (user_id, title) 
-- VALUES ('user-uuid', 'New Chat Session') 
-- RETURNING *;

-- Fetch all sessions for a user (sorted by most recent)
-- SELECT id, title, description, created_at, updated_at
-- FROM sessions 
-- WHERE user_id = 'user-uuid' AND is_active = true
-- ORDER BY updated_at DESC
-- LIMIT 20;

-- Retrieve full chat history for a session
-- SELECT m.id, m.role, m.content, m.metadata, m.created_at,
--        tc.tool_name, tc.parameters, tc.result, tc.success
-- FROM messages m
-- LEFT JOIN tool_calls tc ON m.id = tc.message_id
-- WHERE m.session_id = 'session-uuid'
-- ORDER BY m.created_at ASC;

-- Get last N messages from a session for context
-- SELECT role, content, metadata, created_at
-- FROM messages 
-- WHERE session_id = 'session-uuid'
-- ORDER BY created_at DESC
-- LIMIT 10;