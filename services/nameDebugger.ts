import { UserProfileService } from './userProfileService';
import { UserPreferencesService } from './userPreferencesService';

export class NameDebugger {
  /**
   * Debug name detection across the entire system
   */
  static async debugNameDetection(): Promise<void> {
    console.log('🔍 === NAME DETECTION DEBUG ===\n');

    try {
      // 1. Check backend preferences for name
      console.log('1. 🌐 BACKEND NAME CHECK');
      console.log('─'.repeat(40));
      
      const backendResult = await UserPreferencesService.getUserPreferences();
      if (backendResult.success && backendResult.preferences) {
        const backendName = backendResult.preferences.personalInfo?.name;
        console.log('✅ Backend preferences found');
        console.log('Backend name:', backendName || '❌ NO NAME FOUND');
        
        if (backendName) {
          console.log('✅ Name exists in backend:', `"${backendName}"`);
        } else {
          console.log('❌ No name in backend preferences');
          console.log('Available personalInfo fields:', Object.keys(backendResult.preferences.personalInfo || {}));
        }
      } else {
        console.log('❌ No backend preferences found');
        console.log('Backend error:', backendResult.error);
      }

      // 2. Check local profile service
      console.log('\n2. 📱 LOCAL PROFILE NAME CHECK');
      console.log('─'.repeat(40));
      
      UserProfileService.clearCache(); // Force fresh fetch
      const localProfile = await UserProfileService.getUserProfile();
      
      if (localProfile) {
        const localName = localProfile.personalInfo?.name;
        console.log('✅ Local profile found');
        console.log('Local name:', localName || '❌ NO NAME FOUND');
        
        if (localName) {
          console.log('✅ Name exists in local profile:', `"${localName}"`);
        } else {
          console.log('❌ No name in local profile');
          console.log('Available personalInfo fields:', Object.keys(localProfile.personalInfo || {}));
        }
      } else {
        console.log('❌ No local profile found');
      }

      // 3. Test name-specific queries
      console.log('\n3. 🔍 NAME QUERY TESTS');
      console.log('─'.repeat(40));
      
      const nameQueries = [
        'What is my name?',
        'Who am I?',
        'What should I call you?',
        'Do you know my name?'
      ];

      for (const query of nameQueries) {
        console.log(`\nQuery: "${query}"`);
        const response = await UserProfileService.handlePreferenceQuery(query);
        if (response) {
          console.log(`Response: ${response.substring(0, 100)}...`);
        } else {
          console.log('❌ No response generated');
        }
      }

      // 4. Test personalized greeting
      console.log('\n4. 👋 PERSONALIZED GREETING TEST');
      console.log('─'.repeat(40));
      
      try {
        const greeting = await UserProfileService.getPersonalizedGreeting();
        console.log('Greeting:', greeting);
        
        // Check if greeting contains a name
        const profile = await UserProfileService.getUserProfile();
        const expectedName = profile?.personalInfo?.name;
        
        if (expectedName) {
          if (greeting.includes(expectedName)) {
            console.log(`✅ Greeting correctly uses name: "${expectedName}"`);
          } else {
            console.log(`❌ Greeting missing expected name: "${expectedName}"`);
          }
        } else {
          console.log('⚠️ No name found in profile to check against');
        }
      } catch (error) {
        console.log('❌ Greeting generation failed:', error);
      }

      // 5. Show sample profile structure
      console.log('\n5. 📋 SAMPLE PROFILE STRUCTURE');
      console.log('─'.repeat(40));
      
      if (localProfile) {
        console.log('Current profile structure:');
        console.log('personalInfo:', {
          name: localProfile.personalInfo?.name || 'NOT SET',
          profession: localProfile.personalInfo?.profession || 'NOT SET',
          hobbies: localProfile.personalInfo?.hobbies?.length || 0,
          // Don't log everything, just key fields
        });
      }

      console.log('\n6. 🔧 NAME DETECTION RECOMMENDATIONS');
      console.log('─'.repeat(40));
      
      const profile = await UserProfileService.getUserProfile();
      
      if (!profile) {
        console.log('❌ PRIMARY ISSUE: No profile found');
        console.log('💡 SOLUTION: Complete onboarding in Settings > Preferences');
        console.log('   - Set up your personal information');
        console.log('   - Make sure to enter your name');
        console.log('   - Complete the onboarding process');
      } else if (!profile.personalInfo?.name) {
        console.log('❌ PRIMARY ISSUE: Profile exists but no name set');
        console.log('💡 SOLUTION: Update your profile with your name');
        console.log('   - Go to Settings > Preferences > Personal Info');
        console.log('   - Add your name in the name field');
        console.log('   - Save the preferences');
      } else {
        console.log('✅ Name is properly set in profile');
        console.log('🔍 If name still not working, check:');
        console.log('   - Backend synchronization');
        console.log('   - Cache clearing');
        console.log('   - Response generation logic');
      }

    } catch (error) {
      console.error('❌ Name debugging failed:', error);
    }
  }

  /**
   * Test if a name can be manually set for debugging
   */
  static async testNameSetting(testName: string): Promise<void> {
    console.log(`🧪 Testing manual name setting: "${testName}"`);
    
    try {
      const success = await UserProfileService.updateUserProfile({
        personalInfo: {
          name: testName,
          hobbies: ['testing', 'debugging'] // Add some test data
        },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          onboarding_completed: true,
          preferences_version: '1.0'
        }
      });

      if (success) {
        console.log('✅ Test name set successfully');
        
        // Clear cache and test
        UserProfileService.clearCache();
        
        // Test greeting with new name
        const greeting = await UserProfileService.getPersonalizedGreeting();
        console.log('Updated greeting:', greeting);
        
        // Test name query
        const nameResponse = await UserProfileService.handlePreferenceQuery('What is my name?');
        console.log('Name query response:', nameResponse);
        
      } else {
        console.log('❌ Failed to set test name');
      }
    } catch (error) {
      console.error('❌ Error testing name setting:', error);
    }
  }

  /**
   * Quick name status check
   */
  static async getNameStatus(): Promise<{
    backendName: string | null;
    localName: string | null;
    greetingHasName: boolean;
    nameQueryWorks: boolean;
  }> {
    const status = {
      backendName: null as string | null,
      localName: null as string | null,
      greetingHasName: false,
      nameQueryWorks: false
    };

    try {
      // Check backend
      const backendResult = await UserPreferencesService.getUserPreferences();
      if (backendResult.success && backendResult.preferences) {
        status.backendName = backendResult.preferences.personalInfo?.name || null;
      }

      // Check local
      UserProfileService.clearCache();
      const localProfile = await UserProfileService.getUserProfile();
      if (localProfile) {
        status.localName = localProfile.personalInfo?.name || null;
      }

      // Test greeting
      if (status.localName) {
        const greeting = await UserProfileService.getPersonalizedGreeting();
        status.greetingHasName = greeting.includes(status.localName);
      }

      // Test name query
      const nameResponse = await UserProfileService.handlePreferenceQuery('What is my name?');
      status.nameQueryWorks = nameResponse !== null && !nameResponse.includes("haven't told me your name");

    } catch (error) {
      console.error('Error getting name status:', error);
    }

    return status;
  }
}

export default NameDebugger;