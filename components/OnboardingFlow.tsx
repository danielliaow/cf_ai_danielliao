import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { onboardingSteps, getDefaultPreferences } from '../config/onboardingQuestions';
import { UserPreferencesService } from '../services/userPreferencesService';
import { 
  OnboardingStep, 
  OnboardingQuestion, 
  OnboardingOption, 
  UserPersonalizationData 
} from '../types/userPreferences';

interface OnboardingFlowProps {
  onComplete: (preferences: UserPersonalizationData) => void;
  onSkip?: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { colors, isDarkMode } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = onboardingSteps[currentStepIndex];
  const totalSteps = onboardingSteps.length;
  const progress = (currentStepIndex + 1) / totalSteps;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingTop: 60,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    progressBar: {
      flex: 1,
      height: 8,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 4,
      marginRight: 12,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      minWidth: 40,
    },
    stepTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    stepDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    questionContainer: {
      marginBottom: 32,
    },
    questionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    questionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    optionContainer: {
      marginBottom: 12,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    optionIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    optionContent: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    optionCheck: {
      marginLeft: 12,
    },
    textInput: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
      minHeight: 54,
    },
    textInputFocused: {
      borderColor: colors.primary,
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    switchLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginRight: 16,
    },
    multiSelectHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
      fontStyle: 'italic',
    },
    buttonContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      minHeight: 54,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surfaceVariant,
      borderWidth: 2,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 6,
    },
    primaryButtonText: {
      color: colors.onPrimary,
    },
    secondaryButtonText: {
      color: colors.text,
    },
    skipButton: {
      position: 'absolute',
      top: 60,
      right: 20,
      padding: 8,
    },
    skipButtonText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
  });

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiSelectChange = (questionId: string, optionValue: any) => {
    const currentValues = answers[questionId] || [];
    let newValues;
    
    if (currentValues.includes(optionValue)) {
      newValues = currentValues.filter((v: any) => v !== optionValue);
    } else {
      newValues = [...currentValues, optionValue];
    }
    
    setAnswers(prev => ({ ...prev, [questionId]: newValues }));
  };

  const isCurrentStepValid = () => {
    const requiredQuestions = currentStep.questions.filter(q => q.required);
    
    for (const question of requiredQuestions) {
      const answer = answers[question.id];
      
      if (answer === undefined || answer === null || answer === '') {
        return false;
      }
      
      if (question.type === 'multi_select' && Array.isArray(answer) && answer.length === 0) {
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Build preferences object from answers
      const preferences = buildPreferencesFromAnswers(answers);
      
      // Save to backend
      const result = await UserPreferencesService.saveUserPreferences(preferences, true);
      
      if (result.success) {
        // Complete onboarding
        await UserPreferencesService.completeOnboarding();
        onComplete(preferences);
      } else {
        Alert.alert('Error', result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const buildPreferencesFromAnswers = (answers: Record<string, any>): UserPersonalizationData => {
    const defaultPrefs = getDefaultPreferences();
    const preferences: UserPersonalizationData = {
      ...defaultPrefs,
      metadata: {
        ...defaultPrefs.metadata,
        onboarding_completed: true,
      },
    };

    // Map answers to preference structure
    for (const [questionId, value] of Object.entries(answers)) {
      const question = onboardingSteps
        .flatMap(step => step.questions)
        .find(q => q.id === questionId);
      
      if (!question) continue;

      const category = question.category;
      const key = questionId;

      if (preferences[category]) {
        (preferences[category] as any)[key] = value;
      }
    }

    return preferences;
  };

  const renderQuestion = (question: OnboardingQuestion) => {
    const answer = answers[question.id];

    return (
      <View key={question.id} style={styles.questionContainer}>
        <Text style={styles.questionTitle}>{question.question}</Text>
        {question.subtitle && (
          <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
        )}

        {question.type === 'single_select' && question.options && (
          <View>
            {question.options.map((option) => (
              <TouchableOpacity
                key={option.value.toString()}
                style={[
                  styles.optionButton,
                  answer === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswerChange(question.id, option.value)}
              >
                {option.icon && <Text style={styles.optionIcon}>{option.icon}</Text>}
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {option.description && (
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  )}
                </View>
                <View style={styles.optionCheck}>
                  <Ionicons
                    name={answer === option.value ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={answer === option.value ? colors.primary : colors.border}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {question.type === 'multi_select' && question.options && (
          <View>
            {question.options.map((option) => {
              const isSelected = (answer || []).includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value.toString()}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleMultiSelectChange(question.id, option.value)}
                >
                  {option.icon && <Text style={styles.optionIcon}>{option.icon}</Text>}
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {option.description && (
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    )}
                  </View>
                  <View style={styles.optionCheck}>
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'checkbox-outline'}
                      size={24}
                      color={isSelected ? colors.primary : colors.border}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.multiSelectHint}>Select all that apply</Text>
          </View>
        )}

        {question.type === 'text_input' && (
          <TextInput
            style={styles.textInput}
            value={answer || ''}
            onChangeText={(text) => handleAnswerChange(question.id, text)}
            placeholder={`Enter your ${question.question.toLowerCase()}`}
            placeholderTextColor={colors.textSecondary}
            multiline={question.validation?.maxLength && question.validation.maxLength > 100}
            maxLength={question.validation?.maxLength}
          />
        )}

        {question.type === 'boolean' && (
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{question.question}</Text>
            <Switch
              value={answer || false}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary + '40' }}
              thumbColor={answer ? colors.primary : colors.border}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      {onSkip && (
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentStepIndex + 1}/{totalSteps}
          </Text>
        </View>
        
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Text style={styles.stepDescription}>{currentStep.description}</Text>
      </View>

      {/* Questions */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep.questions
          .filter(question => {
            // Handle conditional questions
            if (question.dependsOn) {
              const dependentAnswer = answers[question.dependsOn.questionId];
              if (Array.isArray(dependentAnswer)) {
                return dependentAnswer.includes(question.dependsOn.value);
              }
              return dependentAnswer === question.dependsOn.value;
            }
            return true;
          })
          .map(renderQuestion)
        }
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          {currentStepIndex > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleBack}
              disabled={isLoading}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { opacity: isCurrentStepValid() && !isLoading ? 1 : 0.6 }
            ]}
            onPress={handleNext}
            disabled={!isCurrentStepValid() || isLoading}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isLoading 
                ? 'Saving...' 
                : currentStepIndex === totalSteps - 1 
                  ? 'Complete' 
                  : 'Next'
              }
            </Text>
            {!isLoading && (
              <Ionicons 
                name={currentStepIndex === totalSteps - 1 ? "checkmark" : "chevron-forward"} 
                size={20} 
                color={colors.onPrimary} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}