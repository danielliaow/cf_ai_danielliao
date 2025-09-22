import { supabase } from '../lib/supabase';
import { UserProfileService } from './userProfileService';
import { UserPreferencesService } from './userPreferencesService';
import { UserPersonalizationData } from '../types/userPreferences';

export interface CompleteUserContext {
  // Google Account Info
  googleAccount: {
    name: string | null;
    email: string | null;
    avatar_url: string | null;
    id: string | null;
  };
  
  // User Preferences Profile
  profile: UserPersonalizationData | null;
  
  // Session Info
  session: {
    user_id: string;
    created_at: string;
    last_sign_in_at: string | null;
  };
  
  // Metadata
  context: {
    fetched_at: string;
    timezone: string;
    current_time: string;
    day_of_week: string;
    time_of_day: string;
  };
}

export class UserContextService {
  /**
   * Get complete user context for AI queries - always fresh data
   */
  static async getCompleteUserContext(): Promise<CompleteUserContext | null> {
    try {
      console.log('🔍 Fetching complete user context...');
      
      // Get current session and user info
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('⚠️ No active session for user context');
        return null;
      }

      const user = session.user;
      
      // Extract Google account information from user metadata
      const googleAccount = {
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        email: user.email || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        id: user.id
      };

      console.log('✅ Google account info:', {
        name: googleAccount.name,
        email: googleAccount.email,
        hasAvatar: !!googleAccount.avatar_url
      });

      // Force fresh profile fetch (clear cache first)
      UserProfileService.clearCache();
      console.log('🔄 Fetching fresh profile data...');
      
      // Get latest profile from backend
      const profileResult = await UserPreferencesService.getUserPreferences();
      let profile: UserPersonalizationData | null = null;
      
      if (profileResult.success && profileResult.preferences) {
        profile = profileResult.preferences;
        console.log('✅ Profile data loaded:', {
          hasName: !!profile.personalInfo?.name,
          hasHobbies: !!(profile.personalInfo?.hobbies?.length),
          hasProfession: !!profile.personalInfo?.profession,
          communicationTone: profile.communicationStyle?.tone,
          onboardingCompleted: profile.metadata?.onboarding_completed
        });
      } else {
        console.log('⚠️ No profile data available');
      }

      // Build complete context
      const now = new Date();
      const context: CompleteUserContext = {
        googleAccount,
        profile,
        session: {
          user_id: user.id,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        },
        context: {
          fetched_at: now.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          current_time: now.toLocaleString(),
          day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
          time_of_day: this.getTimeOfDay(now.getHours())
        }
      };

      console.log('✅ Complete user context prepared');
      return context;

    } catch (error) {
      console.error('❌ Error fetching complete user context:', error);
      return null;
    }
  }

  /**
   * Get user display name with fallback priority
   */
  static async getUserDisplayName(): Promise<string> {
    try {
      const context = await this.getCompleteUserContext();
      if (!context) return 'friend';

      // Priority order: Profile name > Google name > Email username > 'friend'
      if (context.profile?.personalInfo?.name) {
        return context.profile.personalInfo.name;
      }
      
      if (context.googleAccount?.name) {
        return context.googleAccount.name;
      }
      
      if (context.googleAccount?.email) {
        // Extract first part of email as fallback
        const emailParts = context.googleAccount.email.split('@');
        if (emailParts[0]) {
          // Capitalize first letter
          return emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
        }
      }

      return 'friend';
    } catch (error) {
      console.error('Error getting user display name:', error);
      return 'friend';
    }
  }

  /**
   * Build AI context prompt with all user information
   */
  static buildAIContextPrompt(context: CompleteUserContext): string {
    let prompt = '\n=== COMPLETE USER CONTEXT ===\n\n';
    
    // Google Account Information
    prompt += '🔐 **USER ACCOUNT:**\n';
    if (context.googleAccount.name) {
      prompt += `• Name: ${context.googleAccount.name}\n`;
    }
    if (context.googleAccount.email) {
      prompt += `• Email: ${context.googleAccount.email}\n`;
    }
    prompt += `• User ID: ${context.session.user_id}\n`;
    prompt += `• Member since: ${new Date(context.session.created_at).toLocaleDateString()}\n`;
    if (context.session.last_sign_in_at) {
      prompt += `• Last sign in: ${new Date(context.session.last_sign_in_at).toLocaleDateString()}\n`;
    }
    
    // Current Context
    prompt += '\n⏰ **CURRENT CONTEXT:**\n';
    prompt += `• Current time: ${context.context.current_time}\n`;
    prompt += `• Day: ${context.context.day_of_week}\n`;
    prompt += `• Time of day: ${context.context.time_of_day}\n`;
    prompt += `• Timezone: ${context.context.timezone}\n`;
    
    // Profile Information (if available)
    if (context.profile) {
      prompt += '\n👤 **USER PROFILE:**\n';
      
      // Personal Info
      if (context.profile.personalInfo) {
        const personal = context.profile.personalInfo;
        if (personal.name && personal.name !== context.googleAccount.name) {
          prompt += `• Preferred name: ${personal.name}\n`;
        }
        if (personal.profession) {
          prompt += `• Profession: ${personal.profession}`;
          if (personal.industry) prompt += ` (${personal.industry})`;
          if (personal.experience_level) prompt += ` - ${personal.experience_level} level`;
          prompt += '\n';
        }
        if (personal.hobbies && personal.hobbies.length > 0) {
          prompt += `• Hobbies: ${personal.hobbies.join(', ')}\n`;
        }
        if (personal.religion && personal.religion !== 'prefer_not_to_say') {
          prompt += `• Faith/Worldview: ${personal.religion}\n`;
        }
        if (personal.time_zone) {
          prompt += `• User timezone: ${personal.time_zone}\n`;
        }
      }
      
      // Communication Style
      if (context.profile.communicationStyle) {
        prompt += '\n💬 **COMMUNICATION PREFERENCES:**\n';
        const style = context.profile.communicationStyle;
        prompt += `• Tone: ${style.tone}\n`;
        prompt += `• Detail level: ${style.detail_level}\n`;
        prompt += `• Response length: ${style.response_length}\n`;
        prompt += `• Explanation style: ${style.explanation_style}\n`;
        if (style.use_analogies) prompt += '• Loves analogies and metaphors\n';
        if (style.include_examples) prompt += '• Always include practical examples\n';
      }
      
      // Interests
      if (context.profile.contentPreferences?.primary_interests) {
        prompt += '\n🎯 **INTERESTS:**\n';
        prompt += `• Primary interests: ${context.profile.contentPreferences.primary_interests.join(', ')}\n`;
        if (context.profile.contentPreferences.current_affairs_interests?.length) {
          prompt += `• Current affairs: ${context.profile.contentPreferences.current_affairs_interests.join(', ')}\n`;
        }
        if (context.profile.contentPreferences.learning_style) {
          prompt += `• Learning style: ${context.profile.contentPreferences.learning_style}\n`;
        }
      }
      
      // Work Preferences
      if (context.profile.workPreferences) {
        prompt += '\n💼 **WORK STYLE:**\n';
        const work = context.profile.workPreferences;
        if (work.work_schedule) prompt += `• Most productive: ${work.work_schedule}\n`;
        if (work.productivity_style) prompt += `• Work style: ${work.productivity_style}\n`;
        if (work.meeting_preferences) prompt += `• Meeting style: ${work.meeting_preferences}\n`;
        if (work.priority_framework) prompt += `• Prioritization: ${work.priority_framework}\n`;
      }
      
      // Technology
      if (context.profile.domainPreferences?.tech_stack?.length) {
        prompt += '\n💻 **TECHNOLOGY:**\n';
        prompt += `• Tech stack: ${context.profile.domainPreferences.tech_stack.join(', ')}\n`;
        if (context.profile.domainPreferences.coding_style) {
          prompt += `• Coding style: ${context.profile.domainPreferences.coding_style}\n`;
        }
      }
      
      // Assistant Behavior
      if (context.profile.assistantBehavior) {
        prompt += '\n🤖 **ASSISTANT BEHAVIOR:**\n';
        const behavior = context.profile.assistantBehavior;
        if (behavior.personality) prompt += `• Personality: ${behavior.personality}\n`;
        if (behavior.proactivity_level) prompt += `• Proactivity: ${behavior.proactivity_level}\n`;
        if (behavior.follow_up_questions) prompt += '• Ask follow-up questions\n';
        if (behavior.suggest_related_topics) prompt += '• Suggest related topics\n';
      }
      
      prompt += `\n• Profile last updated: ${context.profile.metadata?.updated_at ? new Date(context.profile.metadata.updated_at).toLocaleDateString() : 'Unknown'}\n`;
      prompt += `• Onboarding completed: ${context.profile.metadata?.onboarding_completed ? 'Yes' : 'No'}\n`;
    } else {
      prompt += '\n⚠️ **NO PROFILE DATA** - User has not completed preferences setup\n';
    }
    
    prompt += '\n=== END USER CONTEXT ===\n\n';
    prompt += '**IMPORTANT:** Use this context to provide personalized, relevant responses. ';
    prompt += 'Address the user by their preferred name, reference their interests and work when relevant, ';
    prompt += 'and adapt your communication style to their preferences. Always be helpful and human-like.\n\n';
    
    return prompt;
  }

  /**
   * Get summary of user context for logging
   */
  static getContextSummary(context: CompleteUserContext): string {
    const summary = {
      googleName: context.googleAccount.name,
      googleEmail: context.googleAccount.email,
      profileName: context.profile?.personalInfo?.name,
      hasProfile: !!context.profile,
      hobbiesCount: context.profile?.personalInfo?.hobbies?.length || 0,
      interests: context.profile?.contentPreferences?.primary_interests?.length || 0,
      communicationTone: context.profile?.communicationStyle?.tone,
      onboardingDone: context.profile?.metadata?.onboarding_completed
    };
    
    return JSON.stringify(summary, null, 2);
  }

  private static getTimeOfDay(hour: number): string {
    if (hour < 6) return 'early morning';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }
}

export default UserContextService;