import { MCPTool, MCPToolResponse } from '../../types';
import { supabase } from '../supabase';

export const getUserProfileToolDefinition: MCPTool = {
  name: 'getUserProfile',
  description: 'Fetch comprehensive user profile information including personal data, preferences, app settings, and behavioral patterns to provide personalized responses when user asks about themselves',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      console.log(`🔍 Fetching comprehensive user profile for: ${userId}`);

      // Fetch user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Error fetching user profile:', profileError);
        throw new Error('Failed to fetch user profile');
      }

      // Fetch user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        console.error('❌ Error fetching user preferences:', preferencesError);
        // Don't throw error, preferences might not exist yet
      }

      // Build comprehensive profile
      const userProfile = {
        // Basic Profile Information
        basicInfo: {
          id: userId,
          email: profileData?.email || null,
          full_name: profileData?.full_name || null,
          avatar_url: profileData?.avatar_url || null,
          created_at: profileData?.created_at || null,
          updated_at: profileData?.updated_at || null,
        },

        // Google Integration Status
        googleIntegration: {
          connected: !!profileData?.google_refresh_token,
          hasGoogleTokens: !!profileData?.google_refresh_token,
          canAccessCalendar: !!profileData?.google_refresh_token,
          canAccessGmail: !!profileData?.google_refresh_token,
          canAccessDrive: !!profileData?.google_refresh_token,
        },

        // User Preferences (if available)
        preferences: preferencesData ? {
          onboarding_completed: preferencesData.onboarding_completed || false,
          personal_info: preferencesData.preferences?.personalInfo || null,
          communication_style: preferencesData.preferences?.communicationStyle || null,
          content_preferences: preferencesData.preferences?.contentPreferences || null,
          assistant_behavior: preferencesData.preferences?.assistantBehavior || null,
          privacy_preferences: preferencesData.preferences?.privacyPreferences || null,
          created_at: preferencesData.created_at,
          updated_at: preferencesData.updated_at,
        } : null,

        // Context Information
        context: {
          current_time: new Date().toISOString(),
          day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          time_of_day: new Date().toLocaleTimeString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },

        // Summary for AI
        ai_summary: {
          profile_completeness: calculateProfileCompleteness(profileData, preferencesData),
          key_capabilities: getKeyCapabilities(profileData),
          personalization_level: getPersonalizationLevel(preferencesData),
          recommended_interactions: getRecommendedInteractions(profileData, preferencesData),
        }
      };

      console.log(`✅ Successfully compiled user profile with ${Object.keys(userProfile).length} sections`);

      return {
        success: true,
        data: {
          ...userProfile,
          // Add metadata directly to data object
          metadata: {
            profile_sections: Object.keys(userProfile),
            has_google_integration: userProfile.googleIntegration.connected,
            has_preferences: !!userProfile.preferences,
            completeness_score: userProfile.ai_summary.profile_completeness,
          }
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user profile',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

// Helper functions
function calculateProfileCompleteness(profileData: any, preferencesData: any): number {
  let score = 0;
  const maxScore = 10;

  // Basic profile completeness (4 points)
  if (profileData?.email) score += 1;
  if (profileData?.full_name) score += 1;
  if (profileData?.avatar_url) score += 1;
  if (profileData?.google_refresh_token) score += 1;

  // Preferences completeness (6 points)
  if (preferencesData?.preferences?.personalInfo) score += 1.5;
  if (preferencesData?.preferences?.communicationStyle) score += 1.5;
  if (preferencesData?.preferences?.contentPreferences) score += 1;
  if (preferencesData?.preferences?.assistantBehavior) score += 1;
  if (preferencesData?.preferences?.privacyPreferences) score += 1;

  return Math.round((score / maxScore) * 100);
}

function getKeyCapabilities(profileData: any): string[] {
  const capabilities: string[] = [];

  if (profileData?.google_refresh_token) {
    capabilities.push('Google Calendar access');
    capabilities.push('Gmail access');
    capabilities.push('Google Drive access');
  }

  capabilities.push('Voice interaction');
  capabilities.push('Document analysis');
  capabilities.push('Web search');
  capabilities.push('Session management');

  return capabilities;
}

function getPersonalizationLevel(preferencesData: any): 'high' | 'medium' | 'low' {
  if (!preferencesData?.preferences) return 'low';
  
  const sections = Object.keys(preferencesData.preferences).length;
  if (sections >= 4) return 'high';
  if (sections >= 2) return 'medium';
  return 'low';
}

function getRecommendedInteractions(profileData: any, preferencesData: any): string[] {
  const recommendations: string[] = [];

  if (profileData?.google_refresh_token) {
    recommendations.push('Ask about your calendar events');
    recommendations.push('Search your emails');
    recommendations.push('Access your Google Drive files');
  }

  if (preferencesData?.preferences?.communicationStyle?.preferredTone) {
    recommendations.push(`Interact using ${preferencesData.preferences.communicationStyle.preferredTone} tone`);
  }

  if (!preferencesData?.onboarding_completed) {
    recommendations.push('Complete your preference setup for better personalization');
  }

  recommendations.push('Use voice commands for hands-free interaction');
  recommendations.push('Create and manage documents');
  
  return recommendations;
}