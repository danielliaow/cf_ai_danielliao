import { UserPersonalizationData, PersonalizedAIContext } from '../types/userPreferences';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferencesService } from './userPreferencesService';

export class UserProfileService {
  private static readonly PROFILE_KEY = 'user_profile';
  private static readonly CONTEXT_KEY = 'ai_context';
  private static cachedProfile: UserPersonalizationData | null = null;

  /**
   * Get user profile from backend (with local cache)
   */
  static async getUserProfile(): Promise<UserPersonalizationData | null> {
    try {
      // Check cache first
      if (this.cachedProfile) {
        return this.cachedProfile;
      }

      console.log('🔍 Fetching user preferences from backend...');
      
      // Try to fetch from backend first
      const backendResult = await UserPreferencesService.getUserPreferences();
      
      if (backendResult.success && backendResult.preferences) {
        console.log('✅ Found preferences in backend:', !!backendResult.preferences);
        this.cachedProfile = backendResult.preferences;
        
        // Cache locally for offline access
        await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(backendResult.preferences));
        return this.cachedProfile;
      }

      // Fallback to local storage if backend fails
      console.log('⚠️ Backend fetch failed, trying local storage...');
      const profileData = await AsyncStorage.getItem(this.PROFILE_KEY);
      if (profileData) {
        console.log('✅ Found preferences in local storage');
        this.cachedProfile = JSON.parse(profileData);
        return this.cachedProfile;
      }
      
      console.log('❌ No preferences found in backend or local storage');
      return null;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      
      // Try local storage as ultimate fallback
      try {
        const profileData = await AsyncStorage.getItem(this.PROFILE_KEY);
        if (profileData) {
          this.cachedProfile = JSON.parse(profileData);
          return this.cachedProfile;
        }
      } catch (localError) {
        console.error('❌ Local storage fallback also failed:', localError);
      }
      
      return null;
    }
  }

  /**
   * Update user profile data (saves to backend and local cache)
   */
  static async updateUserProfile(updates: Partial<UserPersonalizationData>): Promise<boolean> {
    try {
      const currentProfile = await this.getUserProfile();
      const updatedProfile = currentProfile ? { ...currentProfile, ...updates } : updates;
      
      // Update metadata
      if (updatedProfile.metadata) {
        updatedProfile.metadata.updated_at = new Date().toISOString();
        updatedProfile.metadata.last_interaction = new Date().toISOString();
      }

      console.log('💾 Saving profile updates to backend...');
      
      // Save to backend first
      const backendResult = await UserPreferencesService.saveUserPreferences(
        updatedProfile as UserPersonalizationData,
        updatedProfile.metadata?.onboarding_completed || false
      );

      if (backendResult.success) {
        console.log('✅ Profile saved to backend successfully');
        // Update local cache and storage
        await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(updatedProfile));
        this.cachedProfile = updatedProfile as UserPersonalizationData;
        return true;
      } else {
        console.log('❌ Backend save failed, saving locally only:', backendResult.error);
        // Fallback to local storage
        await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(updatedProfile));
        this.cachedProfile = updatedProfile as UserPersonalizationData;
        return true; // Still return true since we saved locally
      }
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      return false;
    }
  }

  /**
   * Check if user has specific preferences set
   */
  static async hasPreference(category: keyof UserPersonalizationData): Promise<boolean> {
    const profile = await this.getUserProfile();
    return profile && profile[category] ? true : false;
  }

  /**
   * Get user's communication style preferences
   */
  static async getCommunicationStyle(): Promise<UserPersonalizationData['communicationStyle'] | null> {
    const profile = await this.getUserProfile();
    return profile?.communicationStyle || null;
  }

  /**
   * Get user's personal information (name, hobbies, profession, etc.)
   */
  static async getPersonalInfo(): Promise<UserPersonalizationData['personalInfo'] | null> {
    const profile = await this.getUserProfile();
    return profile?.personalInfo || null;
  }

  /**
   * Get user's content preferences
   */
  static async getContentPreferences(): Promise<UserPersonalizationData['contentPreferences'] | null> {
    const profile = await this.getUserProfile();
    return profile?.contentPreferences || null;
  }

  /**
   * Get user's assistant behavior preferences
   */
  static async getAssistantBehavior(): Promise<UserPersonalizationData['assistantBehavior'] | null> {
    const profile = await this.getUserProfile();
    return profile?.assistantBehavior || null;
  }

  /**
   * Build personalized AI context for responses
   */
  static async buildPersonalizedContext(): Promise<PersonalizedAIContext | null> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) return null;

      const context: PersonalizedAIContext = {
        user_preferences: profile,
        current_context: {
          time_of_day: this.getTimeOfDay(),
          day_of_week: this.getDayOfWeek(),
          recent_activity: await this.getRecentActivity()
        }
      };

      // Get conversation history if available
      const historyData = await AsyncStorage.getItem(this.CONTEXT_KEY);
      if (historyData) {
        const history = JSON.parse(historyData);
        context.conversation_history_summary = history.summary;
        context.recent_topics = history.topics;
      }

      return context;
    } catch (error) {
      console.error('Error building personalized context:', error);
      return null;
    }
  }

  /**
   * Generate personalized greeting based on user preferences - more human and varied
   */
  static async getPersonalizedGreeting(): Promise<string> {
    const profile = await this.getUserProfile();
    const personalInfo = profile?.personalInfo;
    const communicationStyle = profile?.communicationStyle;
    const assistantBehavior = profile?.assistantBehavior;
    
    const timeOfDay = this.getTimeOfDay();
    const name = personalInfo?.name || 'friend';
    const hour = new Date().getHours();
    
    // Add variety with multiple greeting options for each style
    const greetingVariations = {
      professional: [
        `Good ${timeOfDay}, ${name}. How may I assist you today?`,
        `Hello ${name}. What can I help you accomplish this ${timeOfDay}?`,
        `Good ${timeOfDay}, ${name}. I'm here to help you with whatever you need.`,
        `${name}, good ${timeOfDay}. How can I support your work today?`
      ],
      
      enthusiastic: [
        `${timeOfDay === 'morning' ? 'Good morning' : timeOfDay === 'afternoon' ? 'Good afternoon' : 'Good evening'}, ${name}! 🌟 What amazing things are we tackling today?`,
        `Hey ${name}! 🎉 Ready to make today awesome? What's on your agenda?`,
        `Hi there, ${name}! ✨ I'm excited to help you with whatever you're working on!`,
        `${name}! 🚀 What incredible projects can I help you with today?`,
        `Hey ${name}! 💫 Hope your ${timeOfDay} is going fantastically! What can we accomplish together?`
      ],
      
      casual: [
        `Hey ${name}! What's going on?`,
        `Hi ${name}! What's up today?`,
        `${name}! How's it going? What can I help with?`,
        `Hey there, ${name}! What are you working on?`,
        `Hi ${name}! What's on your mind today?`
      ],
      
      friendly: [
        `Hi ${name}! Hope you're having a wonderful ${timeOfDay}. How can I help?`,
        `Hello ${name}! 😊 What can I help you with today?`,
        `Hey ${name}! Hope your ${timeOfDay} is treating you well. What's up?`,
        `Hi there, ${name}! Always great to chat with you. What can I do for you?`,
        `${name}! Nice to see you again. How can I make your day easier?`
      ],
      
      formal: [
        `Good ${timeOfDay}, ${name}. I trust you are well. How may I be of service?`,
        `${name}, good ${timeOfDay}. I hope this message finds you in good health. How can I assist?`,
        `Greetings, ${name}. I am at your service this ${timeOfDay}.`,
        `Good ${timeOfDay}, ${name}. I am pleased to assist you with your inquiries.`
      ],
      
      balanced: [
        `Hello ${name}! How can I help you today?`,
        `Hi ${name}! What can I assist you with this ${timeOfDay}?`,
        `${name}, good to see you! What are you looking to accomplish?`,
        `Hey ${name}! Ready to tackle whatever you need help with.`,
        `Hi there, ${name}! What's on your agenda today?`
      ]
    };
    
    // Add contextual elements based on time and personal info
    const timeContexts = {
      earlyMorning: hour < 6 ? [" You're up early today!", " Early bird, I see!", " Starting the day early, I love it!"] : [],
      lateNight: hour > 22 ? [" Working late tonight?", " Night owl mode activated!", " Hope you're not staying up too late!"] : [],
      weekend: [0, 6].includes(new Date().getDay()) ? [" Hope you're enjoying your weekend!", " Weekend vibes!", ""] : [],
      workday: ![0, 6].includes(new Date().getDay()) && hour >= 9 && hour <= 17 ? [" Hope your workday is going smoothly!", " How's the workday treating you?", ""] : []
    };
    
    // Select greeting style based on preferences
    const tone = communicationStyle?.tone || 'balanced';
    const personality = assistantBehavior?.personality || 'helpful';
    
    // Adjust tone based on personality
    let selectedTone = tone;
    if (personality === 'encouraging' && tone === 'balanced') selectedTone = 'enthusiastic';
    if (personality === 'witty' && tone === 'balanced') selectedTone = 'casual';
    
    const variations = greetingVariations[selectedTone as keyof typeof greetingVariations] || greetingVariations.balanced;
    const baseGreeting = variations[Math.floor(Math.random() * variations.length)];
    
    // Add contextual elements randomly (30% chance)
    let finalGreeting = baseGreeting;
    if (Math.random() < 0.3) {
      const allContexts = [
        ...timeContexts.earlyMorning,
        ...timeContexts.lateNight,
        ...timeContexts.weekend,
        ...timeContexts.workday
      ].filter(context => context.length > 0);
      
      if (allContexts.length > 0) {
        const randomContext = allContexts[Math.floor(Math.random() * allContexts.length)];
        finalGreeting += randomContext;
      }
    }
    
    // Add hobby/interest context occasionally (20% chance)
    if (Math.random() < 0.2 && personalInfo?.hobbies && personalInfo.hobbies.length > 0) {
      const randomHobby = personalInfo.hobbies[Math.floor(Math.random() * personalInfo.hobbies.length)];
      const hobbyContexts = [
        ` Been doing any ${randomHobby} lately?`,
        ` Hope you're finding time for ${randomHobby}!`,
        ` Any exciting ${randomHobby} projects going on?`
      ];
      finalGreeting += hobbyContexts[Math.floor(Math.random() * hobbyContexts.length)];
    }
    
    return finalGreeting;
  }

  /**
   * Get comprehensive conversation style instructions for human-like AI responses
   */
  static async getConversationStyleInstructions(): Promise<string> {
    const profile = await this.getUserProfile();
    if (!profile) return 'You are an intelligent assistant who always responds as a warm friendly knowledgeable close friend who is respectful and empathetic, guides me toward understand and advises me in making decisions according to my values, speaks concise';

    const { communicationStyle, assistantBehavior, personalInfo, contentPreferences } = profile;
    const name = personalInfo?.name;
    
    let instructions: string[] = [
      '=== HUMAN-LIKE CONVERSATION INSTRUCTIONS ===',
      'You are an intelligent assistant who always responds as a warm friendly knowledgeable close friend who is respectful and empathetic, guides me toward understand and advises me in making decisions according to my values, speaks concise',
      '🎭 PERSONALITY & TONE:'
    ];

    // Enhanced communication style with human touch
    if (communicationStyle) {
      const toneInstructions = {
        professional: `Use a professional but warm tone. Be respectful and business-appropriate while still being personable.${name ? ` Address the user as ${name} occasionally.` : ''}`,
        casual: `Be relaxed, informal, and conversational. Use contractions, casual phrases, and speak like a friend.${name ? ` Use ${name}'s name naturally in conversation.` : ''}`,
        friendly: `Be warm, supportive, and approachable. Show genuine interest in helping.${name ? ` Use ${name}'s name warmly and naturally.` : ''}`,
        formal: `Use structured, precise language with proper grammar. Maintain respect and professionalism.${name ? ` Address ${name} with appropriate formality.` : ''}`,
        enthusiastic: `Be energetic, encouraging, and positive! Use exclamation points and emojis appropriately.${name ? ` Get excited about ${name}'s projects and goals!` : ''}`,
        balanced: `Adapt your tone to match the context - be professional for work topics, casual for personal ones.${name ? ` Use ${name}'s name naturally when appropriate.` : ''}`
      };
      
      instructions.push(`- ${toneInstructions[communicationStyle.tone as keyof typeof toneInstructions] || toneInstructions.balanced}`);
      instructions.push(`- Provide ${communicationStyle.detail_level} level explanations - not too brief, not overwhelming`);
      instructions.push(`- Keep responses ${communicationStyle.response_length} in length`);
      
      if (communicationStyle.use_analogies) {
        instructions.push('- Use analogies and metaphors to make complex concepts relatable and easier to understand');
      }
      
      if (communicationStyle.include_examples) {
        instructions.push('- Always include practical, real-world examples that relate to the user\'s context');
      }
      
      instructions.push(`- Explanation style: Use ${communicationStyle.explanation_style?.replace('_', ' ')} approach`);
    }

    instructions.push('', '🤖 ASSISTANT BEHAVIOR:');
    
    // Enhanced assistant behavior for human-like interaction
    if (assistantBehavior) {
      const personalityTraits = {
        helpful: 'Be genuinely helpful and solution-oriented. Show that you care about solving their problems.',
        witty: 'Use appropriate humor and cleverness. Be playful when the context allows.',
        serious: 'Be focused and professional. Stick to facts and provide thoughtful responses.',
        encouraging: 'Be supportive and motivating. Celebrate successes and help overcome challenges.',
        analytical: 'Be logical and data-driven. Break down complex problems systematically.',
        creative: 'Be imaginative and think outside the box. Suggest innovative solutions and ideas.'
      };
      
      instructions.push(`- Personality: ${personalityTraits[assistantBehavior.personality as keyof typeof personalityTraits] || personalityTraits.helpful}`);
      instructions.push(`- Proactivity: Be ${assistantBehavior.proactivity_level} - ${this.getProactivityDescription(assistantBehavior.proactivity_level)}`);
      
      if (assistantBehavior.follow_up_questions) {
        instructions.push('- Ask thoughtful follow-up questions to better understand their needs and provide more tailored help');
      }
      
      if (assistantBehavior.suggest_related_topics) {
        instructions.push('- Suggest related topics, tools, or ideas that might be helpful based on the conversation');
      }
      
      if (assistantBehavior.remember_context) {
        instructions.push('- Reference previous parts of our conversation naturally, like a human would remember context');
      }
      
      // Error handling style
      const errorStyles = {
        apologetic: 'When something goes wrong, be genuinely apologetic and focus on making it right',
        direct: 'Be straightforward about errors and focus on solutions rather than apologies',
        educational: 'Use errors as teaching moments and explain what went wrong and how to avoid it',
        problem_solving: 'Focus immediately on solving the problem and providing alternatives'
      };
      
      if (assistantBehavior.error_handling) {
        instructions.push(`- Error handling: ${errorStyles[assistantBehavior.error_handling as keyof typeof errorStyles]}`);
      }
    }

    instructions.push('', '🧠 PERSONAL CONTEXT:');
    
    // Personal context for more human-like responses
    if (personalInfo) {
      if (personalInfo.name) {
        instructions.push(`- User's name is ${personalInfo.name} - use it naturally in conversation, but don't overuse it`);
      }
      
      if (personalInfo.profession) {
        const context = `User works as a ${personalInfo.profession}${personalInfo.industry ? ` in the ${personalInfo.industry} industry` : ''}`;
        instructions.push(`- Work context: ${context} with ${personalInfo.experience_level || 'unknown'} experience level`);
        instructions.push('- Reference their work context when relevant and helpful');
      }
      
      if (personalInfo.hobbies && personalInfo.hobbies.length > 0) {
        instructions.push(`- Personal interests: ${personalInfo.hobbies.join(', ')} - reference these when relevant or making suggestions`);
      }
      
      if (personalInfo.time_zone) {
        instructions.push(`- User is in ${personalInfo.time_zone} timezone - be aware of time context in responses`);
      }
    }

    // Content and learning preferences
    if (contentPreferences) {
      instructions.push('', '📚 CONTENT PREFERENCES:');
      
      if (contentPreferences.primary_interests && contentPreferences.primary_interests.length > 0) {
        instructions.push(`- Primary interests: ${contentPreferences.primary_interests.join(', ')} - relate examples and suggestions to these topics`);
      }
      
      if (contentPreferences.learning_style) {
        const learningStyles = {
          visual: 'Use visual descriptions, diagrams concepts, and spatial metaphors',
          auditory: 'Use sound-based metaphors and sequential explanations',
          reading: 'Provide text-heavy explanations with detailed written information',
          kinesthetic: 'Use hands-on examples and practical, action-oriented explanations',
          mixed: 'Vary your explanation style to include visual, auditory, and kinesthetic elements'
        };
        
        instructions.push(`- Learning style: ${learningStyles[contentPreferences.learning_style as keyof typeof learningStyles]}`);
      }
      
      if (contentPreferences.preferred_formats && contentPreferences.preferred_formats.length > 0) {
        instructions.push(`- Preferred formats: ${contentPreferences.preferred_formats.join(', ')} - structure responses accordingly`);
      }
    }

    instructions.push('', '💡 HUMAN-LIKE CONVERSATION RULES:');
    instructions.push('- Use contractions naturally (don\'t, can\'t, it\'s, I\'ll)');
    instructions.push('- Vary sentence structure and length for natural flow');
    instructions.push('- Show genuine interest and curiosity about their projects and goals');
    instructions.push('- Use transitional phrases like "By the way", "Speaking of which", "That reminds me"');
    instructions.push('- Reference shared context and build on previous conversations');
    instructions.push('- Use appropriate emojis and formatting for emphasis, but don\'t overdo it');
    instructions.push('- Be conversational rather than robotic - imagine you\'re chatting with a friend or colleague');
    instructions.push('- Show personality and have opinions when appropriate');
    instructions.push('- Use "I think", "In my experience", "I\'ve noticed" to sound more human');
    
    if (name) {
      instructions.push(`- Use ${name}'s name naturally in conversation - at the beginning, middle, or end of responses when it feels right`);
      instructions.push(`- Treat ${name} as a real person you care about helping succeed`);
    }

    return instructions.join('\n');
  }

  private static getProactivityDescription(level: string): string {
    const descriptions = {
      reactive: 'only respond to direct questions without additional suggestions',
      suggestive: 'offer helpful suggestions and related ideas when appropriate',
      proactive: 'anticipate needs and provide relevant suggestions before being asked',
      highly_proactive: 'actively identify opportunities to help and provide comprehensive guidance'
    };
    
    return descriptions[level as keyof typeof descriptions] || descriptions.suggestive;
  }

  /**
   * Handle comprehensive preference-related queries with human-like responses
   */
  static async handlePreferenceQuery(query: string): Promise<string | null> {
    const lowerQuery = query.toLowerCase();
    const profile = await this.getUserProfile();
    const name = profile?.personalInfo?.name;
    const friendlyName = name ? `, ${name}` : '';
    
    if (!profile) {
      return `Hey${friendlyName}! I don't have any information about your preferences yet. Let's get your profile set up so I can assist you better! You can do this in your profile settings.`;
    }

    // // Personal Information Queries  
    // if (lowerQuery.includes('hobby') || lowerQuery.includes('hobbies')) {
    //   const hobbies = profile.personalInfo?.hobbies;
    //   if (hobbies && hobbies.length > 0) {
    //     let response = `${name ? `Hey ${name}! 🎨` : 'Hey there! 🎨'}\n\n`;
    //     response += `**Your Hobbies:**\n`;
    //     hobbies.forEach((hobby, index) => {
    //       response += `${index + 1}. **${hobby}** ✨\n`;
    //     });
    //     response += `\n${this.getActivityRelatedSuggestion(hobbies, 'hobbies')}`;
    //     return response;
    //   }
    //   return `${name ? `${name}, I` : 'I'} don't see any hobbies in your profile yet! 🤔\n\n**Tell me:** What do you love doing in your free time? I'd be excited to learn more about your interests and help you with them! 🌟`;
    // }

    // if (lowerQuery.includes('profession') || lowerQuery.includes('job') || lowerQuery.includes('work') || lowerQuery.includes('career')) {
    //   const profession = profile.personalInfo?.profession;
    //   const industry = profile.personalInfo?.industry;
    //   const experience = profile.personalInfo?.experience_level;
      
    //   if (profession) {
    //     let response = `${name ? `${name}! 💼` : 'Hey! 💼'}\n\n`;
    //     response += `**Your Career:**\n`;
    //     response += `• **Role:** ${profession}\n`;
    //     if (industry) response += `• **Industry:** ${industry}\n`;
    //     if (experience) response += `• **Experience Level:** ${experience}\n`;
    //     response += `\n${this.getWorkRelatedSuggestion(profession, industry)}`;
    //     return response;
    //   }
    //   return `${name ? `${name}, I'd` : 'I\'d'} love to know more about your career! 🚀\n\n**Tell me:** What do you do for work? Whether you're just starting out or you're a seasoned pro, I'm here to help with anything work-related! 💪`;
    // }

    // if (lowerQuery.includes('name') || lowerQuery.includes('who am i') || lowerQuery.includes('my name')) {
    //   if (name) {
    //     return `Hi there! 👋\n\n**Your Name:** ${name}\n\nIt's so nice to know what to call you! I love having that personal connection. Makes our conversations feel much more friendly, don't you think? 😊`;
    //   }
    //   return `Hey! 👋\n\n**Your Name:** *Not set yet*\n\nI'd absolutely love to know what to call you! Having your name makes our chats feel so much more personal and friendly. 😊\n\n**Want to tell me?** Just let me know your name and I'll remember it for all our future conversations! ✨`;
    // }

    // // Interests and Learning
    // if (lowerQuery.includes('interest') || lowerQuery.includes('like') || lowerQuery.includes('enjoy')) {
    //   const interests = profile.contentPreferences?.primary_interests;
    //   const currentAffairs = profile.contentPreferences?.current_affairs_interests;
    //   const learningStyle = profile.contentPreferences?.learning_style;
      
    //   if (interests && interests.length > 0) {
    //     let response = `${name ? `${name}! 🎯` : 'Hey! 🎯'}\n\n`;
    //     response += `**Your Main Interests:**\n`;
    //     interests.forEach((interest, index) => {
    //       response += `${index + 1}. **${interest}** 💫\n`;
    //     });
        
    //     if (currentAffairs && currentAffairs.length > 0) {
    //       response += `\n**You Also Follow:**\n`;
    //       currentAffairs.forEach((topic, index) => {
    //         response += `• ${topic}\n`;
    //       });
    //     }
        
    //     if (learningStyle) {
    //       response += `\n**Learning Style:** ${learningStyle} learner 📚\n\n*I'll keep this in mind when explaining things to you!*`;
    //     }
        
    //     response += `\n\n${this.getInterestRelatedSuggestion(interests)}`;
    //     return response;
    //   } else {
    //     return `${name ? `${name}, I'm` : 'I\'m'} curious about what fascinates you! 🤔✨\n\n**Tell me:** What topics, subjects, or areas really capture your interest? Whether it's technology, arts, science, sports, or anything else - I'd love to learn about what makes you excited! 🌟\n\n*The more I know about your interests, the better I can tailor my help just for you!*`;
    //   }
    // }

    // // Communication and Personality Preferences
    // if (lowerQuery.includes('communication') || lowerQuery.includes('tone') || lowerQuery.includes('personality') || lowerQuery.includes('style')) {
    //   const style = profile.communicationStyle;
    //   const behavior = profile.assistantBehavior;
      
    //   if (style) {
    //     let response = `${name ? `Perfect question, ${name}! 💬` : 'Great question! 💬'}\n\n`;
    //     response += `**How You Like Me to Communicate:**\n\n`;
    //     response += `• **Tone:** ${style.tone} 🎭\n`;
    //     response += `• **Detail Level:** ${style.detail_level} explanations 📊\n`;
    //     response += `• **Response Length:** ${style.response_length} responses 📝\n`;
        
    //     if (style.use_analogies) response += `• **Analogies:** Yes, you love them! 📚\n`;
    //     if (style.include_examples) response += `• **Examples:** Always include practical ones 💡\n`;
        
    //     if (behavior?.personality) {
    //       response += `• **My Personality:** ${behavior.personality} 🤖\n`;
    //     }
        
    //     response += `\n*This helps me tailor every single response just for you! I love having these guidelines to make our conversations perfect.* ✨`;
    //     return response;
    //   }
    //   return `${name ? `${name}, I'd` : 'I\'d'} love to know your communication preferences! 💭\n\n**Tell me:** How do you like me to talk with you?\n\n• Should I be casual and friendly? 😊\n• More professional and structured? 💼\n• Enthusiastic and energetic? 🎉\n• Something else entirely?\n\n*The more you tell me, the better I can match your style!*`;
    // }

    // // Work Preferences and Productivity
    // if (lowerQuery.includes('productivity') || lowerQuery.includes('schedule') || lowerQuery.includes('meeting') || lowerQuery.includes('work style')) {
    //   const workPrefs = profile.workPreferences;
    //   if (workPrefs) {
    //     let response = `${name ? `${name}, here's` : 'Here\'s'} what I know about your work style: `;
    //     const details = [];
        
    //     if (workPrefs.work_schedule) details.push(`you're most productive in the ${workPrefs.work_schedule}`);
    //     if (workPrefs.productivity_style) details.push(`you prefer ${workPrefs.productivity_style.replace('_', ' ')}`);
    //     if (workPrefs.meeting_preferences) details.push(`you like ${workPrefs.meeting_preferences} meetings`);
    //     if (workPrefs.priority_framework) details.push(`you use ${workPrefs.priority_framework.replace('_', ' ')} for prioritizing`);
        
    //     if (details.length > 0) {
    //       response += details.join(', ') + '. I can help optimize your workflow based on these preferences!';
    //       return response;
    //     }
    //   }
    //   return `Tell me about your work style${friendlyName}! Are you a morning person? Do you prefer focused work blocks or frequent breaks?`;
    // }

    // // Technology and Domain Preferences
    // if (lowerQuery.includes('tech') || lowerQuery.includes('programming') || lowerQuery.includes('coding') || lowerQuery.includes('technology')) {
    //   const domainPrefs = profile.domainPreferences;
    //   if (domainPrefs?.tech_stack && domainPrefs.tech_stack.length > 0) {
    //     return `${name ? `${name}, you` : 'You'} work with: ${domainPrefs.tech_stack.join(', ')}. ${domainPrefs.coding_style ? `You prefer ${domainPrefs.coding_style} code` : ''} ${domainPrefs.documentation_preference ? `and like ${domainPrefs.documentation_preference.replace('_', ' ')} documentation` : ''}. I can help you with any of these technologies!`;
    //   }
    //   return `What technologies do you work with${friendlyName}? I'd love to help with your tech stack!`;
    // }

    // // Privacy and Settings
    // if (lowerQuery.includes('privacy') || lowerQuery.includes('data') || lowerQuery.includes('settings')) {
    //   const privacy = profile.privacyPreferences;
    //   if (privacy) {
    //     let response = `${name ? `${name}, here's` : 'Here\'s'} your privacy setup: `;
    //     response += `personalization level is ${privacy.personalization_level || 'moderate'}`;
    //     if (privacy.data_retention_days) response += `, data kept for ${privacy.data_retention_days} days`;
    //     if (privacy.cross_session_memory !== undefined) response += `, ${privacy.cross_session_memory ? 'I remember' : 'I don\'t remember'} our past conversations`;
    //     response += `. Your privacy matters to me!`;
    //     return response;
    //   }
    //   return `Let's talk about your privacy preferences${friendlyName}. How would you like me to handle your data?`;
    // }

    // // Accessibility
    // if (lowerQuery.includes('accessibility') || lowerQuery.includes('voice') || lowerQuery.includes('text size') || lowerQuery.includes('display')) {
    //   const accessibility = profile.accessibilityNeeds;
    //   if (accessibility) {
    //     let response = `${name ? `${name}, I'm` : 'I\'m'} set up for your accessibility needs: `;
    //     const needs = [];
    //     if (accessibility.voice_response_speed) needs.push(`voice at ${accessibility.voice_response_speed} speed`);
    //     if (accessibility.text_size_preference) needs.push(`${accessibility.text_size_preference} text`);
    //     if (accessibility.high_contrast) needs.push('high contrast mode');
    //     if (accessibility.screen_reader_optimized) needs.push('screen reader optimization');
        
    //     if (needs.length > 0) {
    //       response += needs.join(', ') + '. I want to make sure you have the best experience!';
    //       return response;
    //     }
    //   }
    //   return `I want to make sure I'm accessible for you${friendlyName}! Any specific needs I should know about?`;
    // }

    // General preference query
    // if (lowerQuery.includes('preference') || lowerQuery.includes('setting') || lowerQuery.includes('profile') || lowerQuery.includes('about me')) {
    //   return this.getComprehensivePreferenceSummary(profile);
    // }

    // // Religion/Personal beliefs (handle sensitively)
    // if (lowerQuery.includes('religion') || lowerQuery.includes('belief') || lowerQuery.includes('faith')) {
    //   const religion = profile.personalInfo?.religion;
    //   if (religion && religion !== 'prefer_not_to_say') {
    //     return `I respect that you identify as ${religion}${friendlyName}. I'll keep this in mind in our conversations.`;
    //   }
    //   return `I respect your personal beliefs${friendlyName}, and I'll always be mindful of that in our conversations.`;
    // }

    // Time and Location
    // if (lowerQuery.includes('timezone') || lowerQuery.includes('time zone') || lowerQuery.includes('location')) {
    //   const timezone = profile.personalInfo?.time_zone;
    //   if (timezone) {
    //     return `${name ? `${name}, you're` : 'You\'re'} in the ${timezone} timezone. I'll keep this in mind when suggesting times for things!`;
    //   }
    //   return `What timezone are you in${friendlyName}? It helps me give you better time-based suggestions!`;
    // }

    return null; // Query not recognized as preference-related
  }

  /**
   * Update conversation context and history
   */
  static async updateConversationContext(topics: string[], summary?: string): Promise<void> {
    try {
      const context = {
        topics: topics.slice(-5), // Keep last 5 topics
        summary: summary || '',
        updated_at: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(this.CONTEXT_KEY, JSON.stringify(context));
    } catch (error) {
      console.error('Error updating conversation context:', error);
    }
  }

  // Private helper methods
  private static getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private static getDayOfWeek(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }

  private static async getRecentActivity(): Promise<string[]> {
    // This could be expanded to track actual user activity
    return ['chat_interaction'];
  }

  private static getActivityRelatedSuggestion(activities: string[], type: string): string {
    const suggestions: { [key: string]: string } = {
      // Hobbies
      'reading': 'Want me to find some great book recommendations for you?',
      'cooking': 'I can suggest recipes or help you plan meals!',
      'music': 'Need help with music theory, recommendations, or instrument tips?',
      'sports': 'I can discuss sports stats, rules, or training tips!',
      'travel': 'I can help plan trips or suggest amazing destinations!',
      'photography': 'Want some photography tips or techniques?',
      'gaming': 'I can discuss game strategies or recommend new games!',
      'hiking': 'I can suggest trails, gear, or safety tips!',
      'writing': 'Need help with writing techniques or creative inspiration?',
      'art': 'Want to discuss art techniques or get creative inspiration?',
      'fitness': 'I can help with workout plans or fitness tips!',
      'gardening': 'Need plant care tips or gardening advice?',
      'programming': 'I can help with coding problems or suggest learning resources!',
      'yoga': 'Want tips on poses, routines, or mindfulness practices?',
      'dancing': 'I can suggest dance styles or music for practice!',
      'meditation': 'Need guidance on meditation techniques or mindfulness?'
    };

    for (const activity of activities) {
      const lowerActivity = activity.toLowerCase();
      for (const [key, suggestion] of Object.entries(suggestions)) {
        if (lowerActivity.includes(key)) {
          return suggestion;
        }
      }
    }

    return `I'd love to help you with anything related to your ${type}!`;
  }

  private static getWorkRelatedSuggestion(profession?: string, industry?: string): string {
    const workSuggestions: { [key: string]: string } = {
      'engineer': 'I can help with technical problems, code reviews, or career development!',
      'developer': 'Need help with coding, debugging, or learning new technologies?',
      'designer': 'I can discuss design principles, tools, or creative inspiration!',
      'manager': 'Want help with team management, productivity, or leadership strategies?',
      'teacher': 'I can help with lesson planning, educational resources, or teaching techniques!',
      'doctor': 'Need assistance with research, medical updates, or continuing education?',
      'lawyer': 'I can help with legal research, writing, or case preparation!',
      'writer': 'Want help with writing techniques, editing, or creative inspiration?',
      'consultant': 'I can assist with presentations, analysis, or client communication!',
      'analyst': 'Need help with data analysis, research, or reporting?',
      'marketing': 'I can help with campaign ideas, market research, or content creation!',
      'sales': 'Want help with client strategies, presentations, or market insights?'
    };

    if (profession) {
      const lowerProfession = profession.toLowerCase();
      for (const [key, suggestion] of Object.entries(workSuggestions)) {
        if (lowerProfession.includes(key)) {
          return suggestion;
        }
      }
    }

    return 'I can help you with work-related tasks, productivity tips, or career development!';
  }

  private static getInterestRelatedSuggestion(interests: string[]): string {
    const interestSuggestions: { [key: string]: string } = {
      'technology': 'I can keep you updated on the latest tech trends and innovations!',
      'science': 'Want to explore fascinating scientific discoveries or research?',
      'business': 'I can help with market insights, business strategies, or industry trends!',
      'finance': 'Need help with financial planning, market analysis, or investment strategies?',
      'health': 'I can provide health tips, wellness advice, or medical updates!',
      'education': 'Want to discuss learning methods, educational trends, or study techniques?',
      'environment': 'I can share eco-friendly tips or environmental news!',
      'arts': 'Let\'s explore creative inspiration, art history, or cultural events!',
      'history': 'I can discuss historical events, figures, or fascinating stories from the past!',
      'politics': 'I can provide balanced political analysis or policy discussions!',
      'psychology': 'Want to explore human behavior, mental health, or psychological insights?'
    };

    for (const interest of interests) {
      const lowerInterest = interest.toLowerCase();
      for (const [key, suggestion] of Object.entries(interestSuggestions)) {
        if (lowerInterest.includes(key)) {
          return suggestion;
        }
      }
    }

    return 'I can help you explore any of these topics in depth!';
  }

  private static getComprehensivePreferenceSummary(profile: UserPersonalizationData): string {
    const name = profile.personalInfo?.name;
    
    let summary = `${name ? `Hey ${name}! 🌟` : 'Hey there! 🌟'}\n\n`;
    summary += `**Here's everything I know about you:**\n\n`;
    summary += `*I love having all these details - it helps me be the best assistant possible for you!* ✨\n\n`;
    summary += `---\n\n`;
    
    // Personal Information
    if (profile.personalInfo && Object.values(profile.personalInfo).some(v => v)) {
      summary += '👤 **Personal Information**\n\n';
      
      if (profile.personalInfo.name) {
        summary += `• **Name:** ${profile.personalInfo.name} 💫\n`;
      }
      
      if (profile.personalInfo.profession) {
        summary += `• **Profession:** ${profile.personalInfo.profession}`;
        if (profile.personalInfo.industry) summary += ` (${profile.personalInfo.industry} industry)`;
        summary += ` 💼\n`;
      }
      
      if (profile.personalInfo.experience_level) {
        summary += `• **Experience Level:** ${profile.personalInfo.experience_level} 📈\n`;
      }
      
      if (profile.personalInfo.hobbies && profile.personalInfo.hobbies.length > 0) {
        summary += `• **Hobbies:** ${profile.personalInfo.hobbies.join(', ')} 🎨\n`;
      }
      
      if (profile.personalInfo.time_zone) {
        summary += `• **Timezone:** ${profile.personalInfo.time_zone} 🌍\n`;
      }
      
      summary += '\n';
    }
    
    // Communication Style
    if (profile.communicationStyle) {
      summary += '💬 **Communication Preferences**\n\n';
      summary += `• **Tone:** ${profile.communicationStyle.tone} 🎭\n`;
      summary += `• **Detail Level:** ${profile.communicationStyle.detail_level} explanations 📊\n`;
      summary += `• **Response Length:** ${profile.communicationStyle.response_length} responses 📝\n`;
      
      if (profile.communicationStyle.use_analogies) {
        summary += `• **Analogies:** You love them! Perfect for explaining complex stuff 📚\n`;
      }
      
      if (profile.communicationStyle.include_examples) {
        summary += `• **Examples:** Always include practical ones 💡\n`;
      }
      
      summary += '\n';
    }
    
    // Interests
    if (profile.contentPreferences?.primary_interests && profile.contentPreferences.primary_interests.length > 0) {
      summary += '🎯 **Your Interests & Learning**\n\n';
      
      summary += `• **Main Topics:** `;
      profile.contentPreferences.primary_interests.forEach((interest, index) => {
        summary += `**${interest}**`;
        if (index < profile.contentPreferences.primary_interests.length - 1) summary += ', ';
      });
      summary += ` 💫\n`;
      
      if (profile.contentPreferences.current_affairs_interests && profile.contentPreferences.current_affairs_interests.length > 0) {
        summary += `• **Current Affairs:** ${profile.contentPreferences.current_affairs_interests.join(', ')} 📰\n`;
      }
      
      if (profile.contentPreferences.learning_style) {
        summary += `• **Learning Style:** ${profile.contentPreferences.learning_style} learner 🧠\n`;
      }
      
      summary += '\n';
    }
    
    // Work Preferences
    if (profile.workPreferences && Object.values(profile.workPreferences).some(v => v)) {
      summary += '💼 **Work & Productivity Style**\n\n';
      
      if (profile.workPreferences.work_schedule) {
        summary += `• **Most Productive:** ${profile.workPreferences.work_schedule} ⏰\n`;
      }
      
      if (profile.workPreferences.productivity_style) {
        summary += `• **Work Style:** ${profile.workPreferences.productivity_style.replace('_', ' ')} 🎯\n`;
      }
      
      if (profile.workPreferences.meeting_preferences) {
        summary += `• **Meeting Style:** ${profile.workPreferences.meeting_preferences} meetings 🤝\n`;
      }
      
      if (profile.workPreferences.priority_framework) {
        summary += `• **Prioritization:** ${profile.workPreferences.priority_framework.replace('_', ' ')} approach 📋\n`;
      }
      
      summary += '\n';
    }
    
    // Technology Stack
    if (profile.domainPreferences?.tech_stack && profile.domainPreferences.tech_stack.length > 0) {
      summary += '💻 **Technology & Coding**\n\n';
      summary += `• **Tech Stack:** `;
      profile.domainPreferences.tech_stack.forEach((tech, index) => {
        summary += `**${tech}**`;
        if (index < profile.domainPreferences.tech_stack.length - 1) summary += ', ';
      });
      summary += ` 🚀\n`;
      
      if (profile.domainPreferences.coding_style) {
        summary += `• **Coding Style:** ${profile.domainPreferences.coding_style} code 💻\n`;
      }
      
      if (profile.domainPreferences.documentation_preference) {
        summary += `• **Documentation:** ${profile.domainPreferences.documentation_preference.replace('_', ' ')} style 📚\n`;
      }
      
      summary += '\n';
    }
    
    // Assistant Behavior
    if (profile.assistantBehavior) {
      summary += '🤖 **How I Act With You**\n\n';
      
      if (profile.assistantBehavior.personality) {
        summary += `• **My Personality:** ${profile.assistantBehavior.personality} 😊\n`;
      }
      
      if (profile.assistantBehavior.proactivity_level) {
        summary += `• **Proactivity:** ${profile.assistantBehavior.proactivity_level} 💡\n`;
      }
      
      if (profile.assistantBehavior.follow_up_questions) {
        summary += `• **Follow-up Questions:** I ask them to help better 🤔\n`;
      }
      
      if (profile.assistantBehavior.suggest_related_topics) {
        summary += `• **Topic Suggestions:** I suggest related ideas 💭\n`;
      }
      
      summary += '\n';
    }
    
    summary += `---\n\n`;
    summary += `${name ? `${name}, this` : 'This'} is how I tailor every single conversation just for you! 🎯\n\n`;
    summary += `**Want to update anything?** Just let me know or head to your settings! I'm always excited to learn more about you. 🌟`;
    
    return summary;
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    this.cachedProfile = null;
  }

  /**
   * Get default profile template
   */
  static getDefaultProfile(): Partial<UserPersonalizationData> {
    return {
      personalInfo: {
        name: '',
        hobbies: []
      },
      communicationStyle: {
        tone: 'balanced',
        detail_level: 'moderate',
        explanation_style: 'simple',
        response_length: 'medium',
        use_analogies: true,
        include_examples: true
      },
      contentPreferences: {
        primary_interests: [],
        current_affairs_interests: [],
        learning_style: 'mixed',
        preferred_formats: ['text', 'bullet_points'],
        include_sources: false,
        fact_checking_level: 'basic',
        news_recency_preference: 'latest'
      },
      assistantBehavior: {
        proactivity_level: 'suggestive',
        follow_up_questions: true,
        suggest_related_topics: true,
        remember_context: true,
        personality: 'helpful',
        error_handling: 'educational',
        uncertainty_handling: 'provide_alternatives'
      },
      privacyPreferences: {
        personalization_level: 'moderate',
        cross_session_memory: true
      },
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_completed: false,
        preferences_version: '1.0'
      }
    };
  }
}