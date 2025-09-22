import { UserProfileService } from './userProfileService';
import { UserPreferencesService } from './userPreferencesService';
import { AIService } from './aiService';
import { ChatService } from './chatService';

export class PreferencesDebugger {
  /**
   * Comprehensive debugging of the preferences system
   */
  static async debugPreferencesFlow(): Promise<void> {
    console.log('🔍 === PREFERENCES SYSTEM DEBUG REPORT ===\n');

    try {
      // 1. Check backend preferences
      console.log('1. 🌐 BACKEND PREFERENCES CHECK');
      console.log('─'.repeat(40));
      
      const backendPrefs = await UserPreferencesService.getUserPreferences();
      console.log('Backend success:', backendPrefs.success);
      console.log('Backend onboarding completed:', backendPrefs.onboarding_completed);
      console.log('Backend preferences exist:', !!backendPrefs.preferences);
      
      if (backendPrefs.preferences) {
        console.log('✅ Backend preferences found:');
        console.log('  - Name:', backendPrefs.preferences.personalInfo?.name || 'Not set');
        console.log('  - Profession:', backendPrefs.preferences.personalInfo?.profession || 'Not set');
        console.log('  - Hobbies:', backendPrefs.preferences.personalInfo?.hobbies?.length || 0, 'hobbies');
        console.log('  - Communication tone:', backendPrefs.preferences.communicationStyle?.tone || 'Not set');
        console.log('  - Onboarding completed:', backendPrefs.preferences.metadata?.onboarding_completed);
      } else {
        console.log('❌ No backend preferences found');
        console.log('Error:', backendPrefs.error);
      }

      console.log('\n2. 📱 LOCAL PROFILE SERVICE CHECK');
      console.log('─'.repeat(40));
      
      // Clear cache first to force fresh fetch
      UserProfileService.clearCache();
      
      const localProfile = await UserProfileService.getUserProfile();
      console.log('Local profile exists:', !!localProfile);
      
      if (localProfile) {
        console.log('✅ Local profile found:');
        console.log('  - Name:', localProfile.personalInfo?.name || 'Not set');
        console.log('  - Profession:', localProfile.personalInfo?.profession || 'Not set');
        console.log('  - Hobbies:', localProfile.personalInfo?.hobbies?.length || 0, 'hobbies');
        console.log('  - Communication tone:', localProfile.communicationStyle?.tone || 'Not set');
      } else {
        console.log('❌ No local profile found');
      }

      console.log('\n3. 🤖 PREFERENCE QUERIES TEST');
      console.log('─'.repeat(40));
      
      const testQueries = [
        'What are my hobbies?',
        'What is my profession?',
        'What is my name?',
        'Show my preferences'
      ];

      for (const query of testQueries) {
        console.log(`\nQuery: "${query}"`);
        const response = await UserProfileService.handlePreferenceQuery(query);
        if (response) {
          console.log(`✅ Response: ${response.substring(0, 100)}...`);
        } else {
          console.log('❌ No response generated');
        }
      }

      console.log('\n4. 🎨 PERSONALIZED CONTEXT TEST');
      console.log('─'.repeat(40));
      
      const context = await UserProfileService.buildPersonalizedContext();
      if (context) {
        console.log('✅ Personalized context built:');
        console.log('  - User name:', context.user_preferences.personalInfo?.name);
        console.log('  - Communication tone:', context.user_preferences.communicationStyle?.tone);
        console.log('  - Primary interests:', context.user_preferences.contentPreferences?.primary_interests?.join(', '));
        console.log('  - Current time:', context.current_context?.time_of_day);
      } else {
        console.log('❌ Failed to build personalized context');
      }

      console.log('\n5. 💬 AI SERVICE INTEGRATION TEST');
      console.log('─'.repeat(40));
      
      try {
        console.log('Testing AI service with personalized greeting...');
        const greeting = await AIService.getPersonalizedGreeting();
        console.log(`✅ Personalized greeting: "${greeting}"`);
      } catch (error) {
        console.log('❌ AI greeting failed:', error);
      }

      console.log('\n6. 🗨️ CHAT SERVICE INTEGRATION TEST');
      console.log('─'.repeat(40));
      
      try {
        console.log('Testing chat service preference command...');
        const chatResponses = await ChatService.processMessage('/preferences');
        const assistantResponse = chatResponses.find(r => r.type === 'assistant');
        if (assistantResponse) {
          console.log(`✅ Chat response: ${assistantResponse.content.substring(0, 150)}...`);
        } else {
          console.log('❌ No assistant response found');
        }
      } catch (error) {
        console.log('❌ Chat service test failed:', error);
      }

      console.log('\n7. 🔗 DATA FLOW VERIFICATION');
      console.log('─'.repeat(40));
      
      // Test if preference data flows to AI correctly
      try {
        console.log('Testing complete data flow...');
        
        const profile = await UserProfileService.getUserProfile();
        if (profile) {
          console.log('✅ Profile retrieved successfully');
          
          const aiContext = await UserProfileService.buildPersonalizedContext();
          if (aiContext) {
            console.log('✅ AI context built with preferences');
            
            const instructions = await UserProfileService.getConversationStyleInstructions();
            if (instructions) {
              console.log('✅ Style instructions generated');
              console.log(`  Instructions preview: ${instructions.substring(0, 100)}...`);
            } else {
              console.log('⚠️ No style instructions generated');
            }
          } else {
            console.log('❌ Failed to build AI context');
          }
        } else {
          console.log('❌ Profile retrieval failed');
        }
      } catch (error) {
        console.log('❌ Data flow test failed:', error);
      }

      console.log('\n8. 🎯 RECOMMENDATIONS');
      console.log('─'.repeat(40));
      
      if (!backendPrefs.success || !backendPrefs.preferences) {
        console.log('❌ ISSUE: No backend preferences found');
        console.log('💡 SOLUTION: Complete the onboarding process in the app');
        console.log('   - Go to Settings > Preferences');
        console.log('   - Complete the preference setup');
        console.log('   - Make sure onboarding is marked as complete');
      }
      
      if (!localProfile) {
        console.log('❌ ISSUE: Local profile cache is empty');
        console.log('💡 SOLUTION: Profile service will fetch from backend on next use');
      }
      
      if (backendPrefs.preferences && !backendPrefs.preferences.personalInfo?.name) {
        console.log('⚠️ ISSUE: Name not set in preferences');
        console.log('💡 SOLUTION: Update your profile with your name for better personalization');
      }
      
      console.log('\n✅ Debug report completed!');
      
    } catch (error) {
      console.error('❌ Debug report failed:', error);
    }
  }

  /**
   * Quick status check
   */
  static async quickStatus(): Promise<{
    backendPreferences: boolean;
    localProfile: boolean;
    onboardingCompleted: boolean;
    personalizedGreeting: boolean;
  }> {
    const status = {
      backendPreferences: false,
      localProfile: false,
      onboardingCompleted: false,
      personalizedGreeting: false
    };

    try {
      // Check backend
      const backendResult = await UserPreferencesService.getUserPreferences();
      status.backendPreferences = backendResult.success && !!backendResult.preferences;
      status.onboardingCompleted = backendResult.onboarding_completed;

      // Check local profile
      UserProfileService.clearCache();
      const localProfile = await UserProfileService.getUserProfile();
      status.localProfile = !!localProfile;

      // Test personalized greeting
      try {
        const greeting = await AIService.getPersonalizedGreeting();
        status.personalizedGreeting = greeting !== 'Hello! How can I help you today?';
      } catch (error) {
        status.personalizedGreeting = false;
      }

    } catch (error) {
      console.error('Quick status check failed:', error);
    }

    return status;
  }

  /**
   * Test specific preference query
   */
  static async testQuery(query: string): Promise<void> {
    console.log(`🧪 Testing query: "${query}"`);
    console.log('─'.repeat(50));

    try {
      // Test profile service query handling
      console.log('1. Profile Service Response:');
      const profileResponse = await UserProfileService.handlePreferenceQuery(query);
      console.log(profileResponse ? `✅ ${profileResponse}` : '❌ No response');

      // Test AI service processing
      console.log('\n2. AI Service Processing:');
      try {
        const aiResponse = await AIService.processQuery({
          query,
          preferences: {
            responseStyle: 'conversational',
            includeActions: true
          }
        });
        
        if (aiResponse.success && aiResponse.data) {
          console.log(`✅ ${aiResponse.data.response.substring(0, 200)}...`);
          console.log(`Tool used: ${aiResponse.data.toolUsed}`);
        } else {
          console.log(`❌ AI processing failed: ${aiResponse.error}`);
        }
      } catch (error) {
        console.log('❌ AI service error:', error);
      }

      // Test chat service integration
      console.log('\n3. Chat Service Integration:');
      try {
        const chatResponses = await ChatService.processMessage(query);
        const assistantResponse = chatResponses.find(r => r.type === 'assistant');
        if (assistantResponse) {
          console.log(`✅ ${assistantResponse.content.substring(0, 200)}...`);
        } else {
          console.log('❌ No assistant response found');
        }
      } catch (error) {
        console.log('❌ Chat service error:', error);
      }

    } catch (error) {
      console.error('Query test failed:', error);
    }
  }

  /**
   * Fix common issues
   */
  static async autoFix(): Promise<void> {
    console.log('🔧 Auto-fixing common preference issues...\n');

    try {
      // 1. Clear caches to force fresh data
      console.log('1. Clearing caches...');
      UserProfileService.clearCache();
      console.log('✅ Caches cleared');

      // 2. Try to sync backend to local
      console.log('\n2. Syncing backend to local...');
      const backendData = await UserPreferencesService.getUserPreferences();
      if (backendData.success && backendData.preferences) {
        await UserProfileService.updateUserProfile(backendData.preferences);
        console.log('✅ Backend data synced to local cache');
      } else {
        console.log('⚠️ No backend data to sync');
      }

      // 3. Test the fixed system
      console.log('\n3. Testing fixed system...');
      const status = await this.quickStatus();
      console.log('Status after fixes:');
      console.log('  - Backend preferences:', status.backendPreferences ? '✅' : '❌');
      console.log('  - Local profile:', status.localProfile ? '✅' : '❌');
      console.log('  - Onboarding completed:', status.onboardingCompleted ? '✅' : '❌');
      console.log('  - Personalized greeting:', status.personalizedGreeting ? '✅' : '❌');

    } catch (error) {
      console.error('❌ Auto-fix failed:', error);
    }
  }
}

export default PreferencesDebugger;