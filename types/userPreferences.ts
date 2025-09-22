export interface UserPersonalizationData {
  // Personal Information
  personalInfo: {
    name: string;
    profession?: string;
    industry?: string;
    experience_level?: 'beginner' | 'intermediate' | 'expert' | 'mixed';
    time_zone?: string;
    preferred_language?: string;
    religion?: 'catholic' | 'hindu' | 'christian' | 'buddhist' | 'muslim' | 'jewish' | 'spiritual' | 'atheist' | 'agnostic' | 'other' | 'prefer_not_to_say';
    hobbies?: string[];
  };

  // Communication Style
  communicationStyle: {
    tone: 'professional' | 'casual' | 'friendly' | 'formal' | 'enthusiastic' | 'balanced';
    detail_level: 'brief' | 'moderate' | 'detailed' | 'comprehensive';
    explanation_style: 'simple' | 'technical' | 'examples-heavy' | 'step-by-step' | 'conceptual';
    response_length: 'short' | 'medium' | 'long' | 'adaptive';
    use_analogies: boolean;
    include_examples: boolean;
  };

  // Content Preferences
  contentPreferences: {
    primary_interests: string[]; // e.g., 'technology', 'business', 'science', 'arts'
    current_affairs_interests: string[]; // e.g., 'current_events', 'hollywood_entertainment', 'finance_economics', 'conservative_politics', 'liberal_politics'
    learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
    preferred_formats: ('text' | 'bullet_points' | 'numbered_lists' | 'tables' | 'code_blocks')[];
    include_sources: boolean;
    fact_checking_level: 'basic' | 'thorough' | 'academic';
    news_recency_preference: 'latest' | 'verified' | 'comprehensive' | 'balanced';
  };

  // Work & Productivity
  workPreferences: {
    work_schedule?: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
    productivity_style?: 'focused_blocks' | 'frequent_breaks' | 'continuous' | 'mixed';
    meeting_preferences?: 'minimal' | 'structured' | 'collaborative' | 'async';
    priority_framework?: 'urgent_important' | 'time_blocking' | 'energy_based' | 'goal_oriented';
    notification_frequency?: 'immediate' | 'batched' | 'minimal' | 'context_aware';
  };

  // AI Assistant Behavior
  assistantBehavior: {
    proactivity_level: 'reactive' | 'suggestive' | 'proactive' | 'highly_proactive';
    follow_up_questions: boolean;
    suggest_related_topics: boolean;
    remember_context: boolean;
    personality: 'helpful' | 'witty' | 'serious' | 'encouraging' | 'analytical' | 'creative';
    error_handling: 'apologetic' | 'direct' | 'educational' | 'problem_solving';
    uncertainty_handling: 'admit_limits' | 'provide_alternatives' | 'research_first' | 'ask_clarification';
    preferred_model: 'gemini' | 'gpt-4';
  };

  // Domain-Specific Preferences
  domainPreferences: {
    // Technology
    tech_stack?: string[]; // e.g., 'react', 'python', 'aws'
    coding_style?: 'concise' | 'verbose' | 'commented' | 'minimal';
    documentation_preference?: 'inline' | 'separate' | 'examples_first' | 'reference_heavy';
    
    // Business
    business_focus?: ('strategy' | 'operations' | 'finance' | 'marketing' | 'hr' | 'sales')[];
    data_visualization?: 'charts' | 'tables' | 'narratives' | 'mixed';
    
    // Research & Analysis
    research_depth?: 'surface' | 'moderate' | 'deep' | 'academic';
    citation_style?: 'apa' | 'mla' | 'chicago' | 'ieee' | 'informal';
  };

  // Privacy & Security
  privacyPreferences: {
    data_retention_days?: number;
    share_anonymous_usage?: boolean;
    personalization_level?: 'minimal' | 'moderate' | 'full';
    cross_session_memory?: boolean;
  };

  // Accessibility
  accessibilityNeeds?: {
    voice_response_speed?: 'slow' | 'normal' | 'fast';
    text_size_preference?: 'small' | 'medium' | 'large' | 'extra_large';
    high_contrast?: boolean;
    reduce_animations?: boolean;
    screen_reader_optimized?: boolean;
  };

  // Meta Information
  metadata: {
    created_at: string;
    updated_at: string;
    onboarding_completed: boolean;
    preferences_version: string;
    last_interaction?: string;
  };
}

export interface OnboardingQuestion {
  id: string;
  category: keyof UserPersonalizationData;
  question: string;
  subtitle?: string;
  type: 'single_select' | 'multi_select' | 'text_input' | 'slider' | 'boolean' | 'rating';
  options?: OnboardingOption[];
  required: boolean;
  dependsOn?: {
    questionId: string;
    value: any;
  };
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface OnboardingOption {
  value: string | number | boolean;
  label: string;
  description?: string;
  icon?: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  questions: OnboardingQuestion[];
  optional?: boolean;
}

// For AI Context Integration
export interface PersonalizedAIContext {
  user_preferences: UserPersonalizationData;
  conversation_history_summary?: string;
  recent_topics?: string[];
  current_context?: {
    time_of_day: string;
    day_of_week: string;
    recent_activity: string[];
  };
}

// Settings Management
export interface PreferenceSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  settings: PreferenceSetting[];
}

export interface PreferenceSetting {
  key: string;
  title: string;
  description?: string;
  type: 'toggle' | 'select' | 'multi_select' | 'text' | 'slider' | 'number';
  value: any;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export type UserPreferenceUpdatePayload = Partial<UserPersonalizationData>;