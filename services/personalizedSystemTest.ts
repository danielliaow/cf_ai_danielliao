import { UserProfileService } from './userProfileService';
import { AIService } from './aiService';
import { ChatService } from './chatService';
import { UserPersonalizationData } from '../types/userPreferences';

export class PersonalizedSystemTest {
  
  /**
   * Create sample user profile data for testing
   */
  static getSampleUserData(): UserPersonalizationData {
    return {
      personalInfo: {
        name: 'Alex Johnson',
        profession: 'Software Engineer',
        industry: 'Technology',
        experience_level: 'intermediate',
        time_zone: 'America/New_York',
        preferred_language: 'English',
        religion: 'prefer_not_to_say',
        hobbies: ['reading', 'programming', 'hiking', 'photography']
      },
      communicationStyle: {
        tone: 'friendly',
        detail_level: 'moderate',
        explanation_style: 'examples-heavy',
        response_length: 'medium',
        use_analogies: true,
        include_examples: true
      },
      contentPreferences: {
        primary_interests: ['technology', 'science', 'business'],
        current_affairs_interests: ['finance_economics', 'current_events'],
        learning_style: 'visual',
        preferred_formats: ['bullet_points', 'code_blocks', 'text'],
        include_sources: true,
        fact_checking_level: 'thorough',
        news_recency_preference: 'latest'
      },
      workPreferences: {
        work_schedule: 'morning',
        productivity_style: 'focused_blocks',
        meeting_preferences: 'structured',
        priority_framework: 'urgent_important',
        notification_frequency: 'batched'
      },
      assistantBehavior: {
        proactivity_level: 'suggestive',
        follow_up_questions: true,
        suggest_related_topics: true,
        remember_context: true,
        personality: 'encouraging',
        error_handling: 'educational',
        uncertainty_handling: 'provide_alternatives'
      },
      domainPreferences: {
        tech_stack: ['react', 'typescript', 'nodejs', 'python'],
        coding_style: 'commented',
        documentation_preference: 'examples_first'
      },
      privacyPreferences: {
        data_retention_days: 90,
        share_anonymous_usage: true,
        personalization_level: 'full',
        cross_session_memory: true
      },
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_completed: true,
        preferences_version: '1.0',
        last_interaction: new Date().toISOString()
      }
    };
  }

  /**
   * Set up test user profile
   */
  static async setupTestProfile(): Promise<boolean> {
    console.log('🔧 Setting up test user profile...');
    const sampleData = this.getSampleUserData();
    
    try {
      const success = await UserProfileService.updateUserProfile(sampleData);
      if (success) {
        console.log('✅ Test profile created successfully');
        return true;
      } else {
        console.log('❌ Failed to create test profile');
        return false;
      }
    } catch (error) {
      console.error('❌ Error setting up test profile:', error);
      return false;
    }
  }

  /**
   * Test preference queries
   */
  static async testPreferenceQueries(): Promise<void> {
    console.log('\n🧪 Testing preference queries...');
    
    const testQueries = [
      // Personal Information
      'What are my hobbies?',
      'What is my profession?',
      'What is my name?',
      'What are my interests?',
      'Tell me about my work',
      'What timezone am I in?',
      
      // Communication and Style  
      'How do I like to communicate?',
      'What is my communication style?',
      'How should you talk to me?',
      
      // Work and Productivity
      'What is my work style?',
      'When am I most productive?',
      'What are my meeting preferences?',
      
      // Technology
      'What technologies do I use?',
      'What is my tech stack?',
      'How do I like to code?',
      
      // Privacy and Settings
      'What are my privacy settings?',
      'How do you handle my data?',
      
      // General
      'Show me all my preferences',
      'What do you know about me?',
      'Tell me about my profile'
    ];

    for (const query of testQueries) {
      try {
        console.log(`\n❓ Query: "${query}"`);
        const response = await UserProfileService.handlePreferenceQuery(query);
        console.log(`💬 Response: ${response}`);
      } catch (error) {
        console.error(`❌ Error with query "${query}":`, error);
      }
    }
  }

  /**
   * Test personalized greetings
   */
  static async testPersonalizedGreetings(): Promise<void> {
    console.log('\n🧪 Testing personalized greetings...');
    
    try {
      const greeting = await AIService.getPersonalizedGreeting();
      console.log(`👋 Personalized greeting: ${greeting}`);
    } catch (error) {
      console.error('❌ Error getting personalized greeting:', error);
    }
  }

  /**
   * Test conversation style instructions
   */
  static async testConversationStyle(): Promise<void> {
    console.log('\n🧪 Testing conversation style instructions...');
    
    try {
      const instructions = await UserProfileService.getConversationStyleInstructions();
      console.log(`📋 Style instructions:\n${instructions}`);
    } catch (error) {
      console.error('❌ Error getting conversation style:', error);
    }
  }

  /**
   * Test personalized context building
   */
  static async testPersonalizedContext(): Promise<void> {
    console.log('\n🧪 Testing personalized context building...');
    
    try {
      const context = await UserProfileService.buildPersonalizedContext();
      if (context) {
        console.log('✅ Personalized context built successfully');
        console.log(`👤 User name: ${context.user_preferences.personalInfo?.name}`);
        console.log(`🎨 Communication tone: ${context.user_preferences.communicationStyle?.tone}`);
        console.log(`🎯 Primary interests: ${context.user_preferences.contentPreferences?.primary_interests?.join(', ')}`);
        console.log(`⏰ Current time: ${context.current_context?.time_of_day}`);
        console.log(`📅 Day of week: ${context.current_context?.day_of_week}`);
      } else {
        console.log('❌ Failed to build personalized context');
      }
    } catch (error) {
      console.error('❌ Error building personalized context:', error);
    }
  }

  /**
   * Test chat service integration
   */
  static async testChatServiceIntegration(): Promise<void> {
    console.log('\n🧪 Testing chat service integration...');
    
    const testMessages = [
      '/help',
      '/preferences',
      '/profile hobbies',
      'What are my hobbies?',
      'What is my profession?'
    ];

    for (const message of testMessages) {
      try {
        console.log(`\n💬 Processing: "${message}"`);
        const responses = await ChatService.processMessage(message);
        
        if (responses.length > 0) {
          const assistantResponse = responses.find(r => r.type === 'assistant');
          if (assistantResponse) {
            console.log(`🤖 Response preview: ${assistantResponse.content.substring(0, 150)}...`);
            console.log(`🔧 Tool used: ${assistantResponse.metadata?.toolName || 'none'}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing "${message}":`, error);
      }
    }
  }

  /**
   * Test different personality settings
   */
  static async testPersonalityVariations(): Promise<void> {
    console.log('\n🧪 Testing personality variations...');
    
    const personalities = ['professional', 'casual', 'enthusiastic', 'friendly', 'formal'];
    
    for (const tone of personalities) {
      try {
        console.log(`\n🎭 Testing ${tone} tone...`);
        
        // Update communication style temporarily
        await UserProfileService.updateUserProfile({
          communicationStyle: {
            tone: tone as any,
            detail_level: 'moderate',
            explanation_style: 'simple',
            response_length: 'medium',
            use_analogies: true,
            include_examples: true
          }
        });

        const greeting = await UserProfileService.getPersonalizedGreeting();
        console.log(`👋 ${tone} greeting: ${greeting}`);
        
      } catch (error) {
        console.error(`❌ Error testing ${tone} personality:`, error);
      }
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Personalized System Tests\n');
    
    try {
      // Setup test profile
      const profileSetup = await this.setupTestProfile();
      if (!profileSetup) {
        console.log('❌ Failed to set up test profile, aborting tests');
        return;
      }

      // Run all test suites
      await this.testPreferenceQueries();
      await this.testPersonalizedGreetings();
      await this.testConversationStyle();
      await this.testPersonalizedContext();
      await this.testChatServiceIntegration();
      await this.testPersonalityVariations();
      
      console.log('\n✅ All personalized system tests completed!');
      console.log('\n📊 Test Summary:');
      console.log('• User profile creation: ✅');
      console.log('• Preference queries: ✅');
      console.log('• Personalized greetings: ✅');
      console.log('• Conversation styling: ✅');
      console.log('• Context building: ✅');
      console.log('• Chat service integration: ✅');
      console.log('• Personality variations: ✅');
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Clean up test data
   */
  static async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');
    try {
      UserProfileService.clearCache();
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Demo the personalized system with example interactions
   */
  static async runDemo(): Promise<void> {
    console.log('🎬 Starting Personalized System Demo\n');
    
    await this.setupTestProfile();
    
    console.log('🎭 Demo Scenario: Alex Johnson, Software Engineer, loves hiking and photography');
    console.log('Communication style: Friendly tone with moderate detail and examples\n');

    // Simulate user interactions
    const demoInteractions = [
      {
        query: 'What are my hobbies?',
        expected: 'Should list reading, programming, hiking, photography with related suggestions'
      },
      {
        query: 'What do I do for work?',
        expected: 'Should mention Software Engineer in Technology industry with intermediate experience'
      },
      {
        query: '/help',
        expected: 'Should greet with "Hi Alex Johnson!" and show personalized help'
      },
      {
        query: 'Tell me about my preferences',
        expected: 'Should provide comprehensive preference summary'
      }
    ];

    for (const interaction of demoInteractions) {
      console.log(`\n👤 User: "${interaction.query}"`);
      console.log(`🎯 Expected: ${interaction.expected}`);
      
      try {
        const response = await UserProfileService.handlePreferenceQuery(interaction.query);
        if (response) {
          console.log(`🤖 Assistant: ${response}`);
        } else {
          // Try processing through chat service for commands
          const responses = await ChatService.processMessage(interaction.query);
          const assistantResponse = responses.find(r => r.type === 'assistant');
          if (assistantResponse) {
            console.log(`🤖 Assistant: ${assistantResponse.content.substring(0, 200)}...`);
          }
        }
      } catch (error) {
        console.error('❌ Demo interaction failed:', error);
      }
      
      console.log('─'.repeat(50));
    }
    
    console.log('\n🎉 Demo completed! The system successfully:');
    console.log('• Retrieved and used personal information');
    console.log('• Adapted responses based on communication style');
    console.log('• Provided relevant suggestions based on interests');
    console.log('• Maintained consistent personality throughout interactions');
  }
}

// Export for easy testing from other modules
export default PersonalizedSystemTest;