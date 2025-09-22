
import express from 'express';
import { authenticateToken } from '../middleware/auth';
// import { corsMiddleware } from '../middleware/corsMiddleware';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Apply CORS to all routes

interface UserPreferences {
  id?: string;
  user_id: string;
  preferences: any; // JSON object containing all preference data
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get user preferences
 */
router.get('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`📋 Getting preferences for user: ${userId}`);

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching user preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    if (!data) {
      // Return default preferences if none found
      console.log('📋 No preferences found, returning defaults');
      return res.json({
        success: true,
        preferences: null,
        onboarding_completed: false,
      });
    }

    console.log(`✅ Found preferences for user: ${userId}`);
    res.json({
      success: true,
      preferences: data.preferences,
      onboarding_completed: data.onboarding_completed,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });

  } catch (error) {
    console.error('❌ Error in get preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Save or update user preferences
 */
router.post('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { preferences, onboarding_completed = false } = req.body;

    if (!preferences) {
      return res.status(400).json({ error: 'Preferences data is required' });
    }

    console.log(`💾 Saving preferences for user: ${userId}`, {
      onboarding_completed,
      preferencesKeys: Object.keys(preferences),
    });

    // Validate preferences structure
    const requiredSections = [
      'personalInfo',
      'communicationStyle',
      'contentPreferences',
      'assistantBehavior',
      'privacyPreferences'
    ];

    for (const section of requiredSections) {
      if (!preferences[section]) {
        return res.status(400).json({ 
          error: `Missing required preference section: ${section}` 
        });
      }
    }

    // Check if preferences already exist
    const { data: existingData } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;

    if (existingData) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          preferences,
          onboarding_completed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      result = { data, error };
      console.log('🔄 Updated existing preferences');
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          preferences,
          onboarding_completed,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      result = { data, error };
      console.log('✨ Created new preferences');
    }

    if (result.error) {
      console.error('❌ Error saving user preferences:', result.error);
      return res.status(500).json({ error: 'Failed to save preferences' });
    }

    console.log(`✅ Successfully saved preferences for user: ${userId}`);
    res.json({
      success: true,
      message: 'Preferences saved successfully',
      data: result.data,
    });

  } catch (error) {
    console.error('❌ Error in save preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update specific preference sections
 */
router.patch('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Update data is required' });
    }

    console.log(`🔄 Partial update for user: ${userId}`, Object.keys(updates));

    // Get current preferences
    const { data: currentData, error: fetchError } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching current preferences:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch current preferences' });
    }

    // Merge with existing preferences
    const currentPreferences = currentData?.preferences || {};
    const mergedPreferences = { ...currentPreferences };

    // Deep merge the updates
    for (const [section, sectionUpdates] of Object.entries(updates)) {
      if (typeof sectionUpdates === 'object' && sectionUpdates !== null) {
        mergedPreferences[section] = {
          ...(mergedPreferences[section] || {}),
          ...sectionUpdates,
        };
      } else {
        mergedPreferences[section] = sectionUpdates;
      }
    }

    // Update metadata
    if (!mergedPreferences.metadata) {
      mergedPreferences.metadata = {};
    }
    mergedPreferences.metadata.updated_at = new Date().toISOString();

    // Save updated preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferences: mergedPreferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating preferences:', error);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    console.log(`✅ Successfully updated preferences for user: ${userId}`);
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data,
    });

  } catch (error) {
    console.error('❌ Error in update preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Complete onboarding
 */
router.post('/preferences/complete-onboarding', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`🎉 Completing onboarding for user: ${userId}`);

    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error completing onboarding:', error);
      return res.status(500).json({ error: 'Failed to complete onboarding' });
    }

    console.log(`✅ Onboarding completed for user: ${userId}`);
    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data,
    });

  } catch (error) {
    console.error('❌ Error in complete onboarding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user preferences for AI context
 */
router.get('/preferences/ai-context', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences, onboarding_completed')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching AI context preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch AI context' });
    }

    // Prepare AI context with personalization data
    const aiContext = {
      user_preferences: data?.preferences || null,
      onboarding_completed: data?.onboarding_completed || false,
      current_context: {
        time_of_day: new Date().toLocaleTimeString(),
        day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        timestamp: new Date().toISOString(),
      },
    };

    res.json({
      success: true,
      ai_context: aiContext,
    });

  } catch (error) {
    console.error('❌ Error in get AI context:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Reset preferences (for testing)
 */
router.delete('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`🗑️ Resetting preferences for user: ${userId}`);

    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error resetting preferences:', error);
      return res.status(500).json({ error: 'Failed to reset preferences' });
    }

    console.log(`✅ Preferences reset for user: ${userId}`);
    res.json({
      success: true,
      message: 'Preferences reset successfully',
    });

  } catch (error) {
    console.error('❌ Error in reset preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;