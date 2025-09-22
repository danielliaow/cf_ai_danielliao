import { OnboardingStep, OnboardingQuestion } from '../types/userPreferences';

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'religion',
    title: 'Religious Background',
    description: 'Tell me about your religious or spiritual background.',
    questions: [
      {
        id: 'religion',
        category: 'personalInfo',
        question: 'What is your religious or spiritual background?',
        type: 'single_select',
        required: false,
        options: [
          { value: 'catholic', label: 'Catholic', icon: '⛪' },
          { value: 'hindu', label: 'Hindu', icon: '🕉️' },
          { value: 'christian', label: 'Christian', icon: '✝️' },
          { value: 'buddhist', label: 'Buddhist', icon: '☸️' },
        ],
      },
    ],
  },
  {
    id: 'hobbies',
    title: 'Your Hobbies',
    description: 'What are your main hobbies and activities?',
    questions: [
      {
        id: 'hobbies',
        category: 'personalInfo',
        question: 'Select your hobbies and activities',
        type: 'multi_select',
        required: true,
        options: [
          { value: 'sports', label: 'Sports', icon: '⚽' },
          { value: 'music', label: 'Music', icon: '🎵' },
          { value: 'outdoor_activities', label: 'Outdoor Activities', icon: '🏕️' },
          { value: 'reading', label: 'Reading', icon: '📚' },
          { value: 'gaming', label: 'Gaming', icon: '🎮' },
          { value: 'cooking', label: 'Cooking', icon: '🍳' },
        ],
      },
    ],
  },
  {
    id: 'interests',
    title: 'Your Interests',
    description: 'What topics and current affairs interest you?',
    questions: [
      {
        id: 'interests',
        category: 'contentPreferences',
        question: 'Which topics interest you most?',
        type: 'multi_select',
        required: true,
        options: [
          { value: 'current_events', label: 'Current Events', icon: '📰' },
          { value: 'hollywood_entertainment', label: 'Hollywood Entertainment', icon: '🎬' },
          { value: 'finance', label: 'Finance', icon: '💰' },
          { value: 'conservative_politics', label: 'Conservative Politics', icon: '🐘' },
          { value: 'liberal_politics', label: 'Liberal Politics', icon: '🫏' },
        ],
      },
    ],
  },
];

// Helper function to get all questions in a flat array
export const getAllQuestions = (): OnboardingQuestion[] => {
  return onboardingSteps.reduce((acc, step) => {
    return [...acc, ...step.questions];
  }, [] as OnboardingQuestion[]);
};

// Helper function to get questions by category
export const getQuestionsByCategory = (category: string): OnboardingQuestion[] => {
  return getAllQuestions().filter(question => question.category === category);
};

// Default user preferences - simplified to store only the 3 key things
export const getDefaultPreferences = () => ({
  personalInfo: {
    name: '',
    religion: undefined,
    hobbies: [],
  },
  communicationStyle: {
    tone: 'balanced' as const,
    detail_level: 'moderate' as const,
    explanation_style: 'examples-heavy' as const,
    response_length: 'adaptive' as const,
    use_analogies: true,
    include_examples: true,
  },
  contentPreferences: {
    primary_interests: [],
    current_affairs_interests: [],
    interests: [], // our custom field
    learning_style: 'mixed' as const,
    preferred_formats: ['text', 'bullet_points'],
    include_sources: true,
    fact_checking_level: 'thorough' as const,
    news_recency_preference: 'balanced' as const,
  },
  workPreferences: {},
  assistantBehavior: {
    proactivity_level: 'suggestive' as const,
    follow_up_questions: true,
    suggest_related_topics: true,
    remember_context: true,
    personality: 'helpful' as const,
    error_handling: 'problem_solving' as const,
    uncertainty_handling: 'provide_alternatives' as const,
  },
  domainPreferences: {},
  privacyPreferences: {},
  metadata: {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    onboarding_completed: false,
    preferences_version: '1.0.0',
  },
});