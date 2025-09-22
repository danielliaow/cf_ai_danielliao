-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding ON user_preferences(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'Stores user personalization preferences and onboarding data';
COMMENT ON COLUMN user_preferences.preferences IS 'JSONB object containing all user preference data';
COMMENT ON COLUMN user_preferences.onboarding_completed IS 'Whether the user has completed the onboarding flow';

-- Insert some example preference structure (optional, for documentation)
INSERT INTO user_preferences (user_id, preferences, onboarding_completed) 
VALUES (
    '00000000-0000-0000-0000-000000000000', -- Example UUID (will be replaced by actual user IDs)
    '{
        "personalInfo": {
            "name": "Example User",
            "profession": "Software Developer",
            "experience_level": "intermediate"
        },
        "communicationStyle": {
            "tone": "friendly",
            "detail_level": "moderate",
            "explanation_style": "examples-heavy"
        },
        "contentPreferences": {
            "primary_interests": ["technology", "business"],
            "learning_style": "mixed",
            "preferred_formats": ["text", "bullet_points"]
        },
        "assistantBehavior": {
            "proactivity_level": "suggestive",
            "personality": "helpful",
            "follow_up_questions": true
        },
        "privacyPreferences": {
            "personalization_level": "moderate",
            "cross_session_memory": true
        },
        "metadata": {
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "preferences_version": "1.0.0"
        }
    }',
    false
) ON CONFLICT (user_id) DO NOTHING;