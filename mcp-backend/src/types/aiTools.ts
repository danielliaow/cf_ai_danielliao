export interface AIToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  examples?: (string | number | boolean | string[] | number[])[];
}

export interface AIToolMetadata {
  name: string;
  description: string;
  category: 'calendar' | 'email' | 'productivity' | 'system' | 'web' | 'external' | 'social' | 'custom' | 'search' | 'files' | 'drive' | 'documents' | 'profile';
  parameters: AIToolParameter[];
  examples: {
    query: string;
    expectedParams: Record<string, any>;
    description: string;
  }[];
  timeContext?: 'current' | 'future' | 'past' | 'any' | 'recent' | 'realtime';
  dataAccess: 'read' | 'write' | 'both';
}

export interface AIToolSelection {
  tool: string;
  confidence: number;
  parameters: Record<string, any>;
  reasoning: string;
  geminiOutput?: string;
}

export interface DeeplinkAction {
  type: 'app_open';
  appName: string;
  action: string;
  data?: {
    searchTerm?: string;
    phoneNumber?: string;
    location?: string;
    destination?: string;
  };
}

export interface AIResponse {
  success: boolean;
  toolUsed?: string;
  rawData?: any;
  naturalResponse: string;
  reasoning?: string;
  suggestedActions?: string[];
  chainedTools?: string[];
  error?: string;
  deeplinkAction?: DeeplinkAction;
}

export interface UserContext {
  query: string;
  timestamp: string;
  timezone?: string;
  sessionId?: string;
  styleInstructions?: string;
  preferences?: {
    responseStyle: 'brief' | 'detailed' | 'conversational';
    includeActions: boolean;
    isVoiceMode?: boolean;
    cleanForSpeech?: boolean;
    isVoiceQuery?: boolean;
  };
  personalization?: {
    userPreferences: any; // User's complete preference data
    onboardingCompleted: boolean;
    googleAccount?: {
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
    currentContext: {
      timeOfDay: string;
      dayOfWeek: string;
      timestamp: string;
      timezone: string;
    };
  };
  // Enhanced complete user context
  completeUserContext?: {
    googleAccount: {
      name: string | null;
      email: string | null;
      avatar_url: string | null;
      id: string | null;
    };
    profile: any; // UserPersonalizationData
    session: {
      user_id: string;
      created_at: string;
      last_sign_in_at: string | null;
    };
    context: {
      fetched_at: string;
      timezone: string;
      current_time: string;
      day_of_week: string;
      time_of_day: string;
    };
  };
}