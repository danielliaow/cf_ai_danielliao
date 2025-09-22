export class TitleGenerator {
  private static readonly CREATIVE_NAMES = [
    'Cosmic Chat', 'Digital Dialogue', 'Brain Burst', 'Neural Network', 'Quantum Query',
    'Smart Session', 'AI Adventure', 'Mind Meld', 'Cyber Chat', 'Logic Loop',
    'Data Dive', 'Code Conversation', 'Tech Talk', 'Binary Banter', 'Algorithm Alley',
    'Pixel Pow-wow', 'Circuit Chat', 'Silicon Symposium', 'Virtual Venture', 'Electric Exchange',
    'Thought Thread', 'Idea Engine', 'Knowledge Quest', 'Wisdom Wave', 'Insight Isle',
    'Discovery Dock', 'Learning Lab', 'Question Queue', 'Answer Avenue', 'Solution Station',
    'Problem Portal', 'Help Hub', 'Support Stream', 'Guidance Gateway', 'Mentor Mode',
    'Expert Exchange', 'Skill Share', 'Talent Talk', 'Creative Corner', 'Innovation Inn',
    'Future Focus', 'Tomorrow Talk', 'Next-Gen Chat', 'Modern Moment', 'Digital Dawn',
    'Bright Brief', 'Quick Quest', 'Rapid Rapport', 'Fast Facts', 'Swift Session',
    'Lightning Link', 'Turbo Talk', 'Speed Session', 'Instant Insight', 'Flash Forum'
  ];

  private static readonly ADJECTIVES = [
    'Brilliant', 'Creative', 'Dynamic', 'Engaging', 'Fascinating', 'Innovative', 'Insightful',
    'Interactive', 'Productive', 'Thoughtful', 'Strategic', 'Focused', 'Deep', 'Quick',
    'Smart', 'Clever', 'Wise', 'Sharp', 'Clear', 'Bright', 'Fresh', 'Bold', 'Powerful'
  ];

  private static readonly NOUNS = [
    'Discussion', 'Conversation', 'Session', 'Chat', 'Exchange', 'Dialogue', 'Talk',
    'Meeting', 'Conference', 'Brainstorm', 'Planning', 'Strategy', 'Analysis', 'Review',
    'Workshop', 'Consultation', 'Collaboration', 'Project', 'Task', 'Mission'
  ];

  /**
   * Generate a title from the first message content
   */
  static generateFromMessage(message: string): string {
    const cleaned = message.trim();
    
    if (cleaned.length === 0) {
      return this.generateCreativeName();
    }

    // If message is short, use it as-is
    if (cleaned.length <= 50) {
      return cleaned;
    }

    // Try to extract a meaningful title from the message
    const title = this.extractMeaningfulTitle(cleaned);
    
    return title || this.generateCreativeName();
  }

  /**
   * Generate a random creative name
   */
  static generateCreativeName(): string {
    const creativeName = this.CREATIVE_NAMES[Math.floor(Math.random() * this.CREATIVE_NAMES.length)];
    return creativeName;
  }

  /**
   * Generate a descriptive name using adjectives and nouns
   */
  static generateDescriptiveName(): string {
    const adjective = this.ADJECTIVES[Math.floor(Math.random() * this.ADJECTIVES.length)];
    const noun = this.NOUNS[Math.floor(Math.random() * this.NOUNS.length)];
    return `${adjective} ${noun}`;
  }

  /**
   * Generate any random title (mix of creative and descriptive)
   */
  static generateRandomTitle(): string {
    const useCreative = Math.random() < 0.7; // 70% chance for creative names
    return useCreative ? this.generateCreativeName() : this.generateDescriptiveName();
  }

  /**
   * Extract meaningful title from longer message
   */
  private static extractMeaningfulTitle(message: string): string | null {
    // Remove common question words and clean up
    let cleaned = message
      .replace(/^(what|how|why|when|where|who|can you|could you|please|help me)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    // If still too long, try to find a natural break point
    if (cleaned.length > 50) {
      const words = cleaned.split(' ');
      let title = '';
      
      for (const word of words) {
        const nextTitle = title + (title ? ' ' : '') + word;
        if (nextTitle.length > 47) break;
        title = nextTitle;
      }
      
      if (title.length >= 10) { // Only use if we got a reasonable length
        return this.capitalizeTitle(title + '...');
      }
    } else {
      return this.capitalizeTitle(cleaned);
    }

    return null;
  }

  /**
   * Properly capitalize a title
   */
  private static capitalizeTitle(title: string): string {
    return title
      .split(' ')
      .map((word, index) => {
        // Always capitalize first word and words longer than 3 characters
        // Skip articles, conjunctions, and prepositions unless they're first
        const skipWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'on', 'or', 'the', 'to', 'up'];
        
        if (index === 0 || word.length > 3 || !skipWords.includes(word.toLowerCase())) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word.toLowerCase();
      })
      .join(' ');
  }

  /**
   * Smart title generation that prefers message content but falls back to creative names
   */
  static generateSmartTitle(firstMessage?: string): string {
    if (firstMessage && firstMessage.trim().length > 0) {
      return this.generateFromMessage(firstMessage);
    }
    return this.generateRandomTitle();
  }
}