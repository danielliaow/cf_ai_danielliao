import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  SafeAreaView,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { onboardingSteps, getDefaultPreferences } from '../config/onboardingQuestions';
import { UserPreferencesService } from '../services/userPreferencesService';
import { UserPersonalizationData } from '../types/userPreferences';

const { width: screenWidth } = Dimensions.get('window');

interface CarouselOnboardingProps {
  onComplete: (preferences: UserPersonalizationData) => void;
  onSkip?: () => void;
  isEditMode?: boolean;
  existingPreferences?: UserPersonalizationData | null;
}

export function CarouselOnboarding({ onComplete, onSkip, isEditMode = false, existingPreferences = null }: CarouselOnboardingProps) {
  const { colors, isDarkMode } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const totalSteps = onboardingSteps.length;
  const progress = (currentIndex + 1) / totalSteps;

  // Initialize answers from existing preferences in edit mode
  useEffect(() => {
    if (isEditMode && existingPreferences) {
      const convertedAnswers: Record<string, any> = {};
      
      onboardingSteps.forEach(step => {
        step.questions.forEach(question => {
          const category = question.category as keyof UserPersonalizationData;
          const key = question.id;
          
          if (existingPreferences[category]) {
            const categoryData = existingPreferences[category] as any;
            if (categoryData[key] !== undefined) {
              convertedAnswers[question.id] = categoryData[key];
            }
          }
        });
      });
      
      setAnswers(convertedAnswers);
    }
  }, [isEditMode, existingPreferences]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingTop: 60,
      alignItems: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      width: '100%',
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
    carouselContainer: {
      flex: 1,
    },
    stepContainer: {
      width: screenWidth,
      flex: 1,
      paddingHorizontal: 20,
    },
    stepHeader: {
      alignItems: 'center',
      marginBottom: 30,
    },
    stepTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    stepDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    questionsContainer: {
      flex: 1,
    },
    questionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    questionTitle: {
      fontSize: 18,
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
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    optionTile: {
      flexBasis: '30%',
      minWidth: 90,
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    optionTileSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    optionIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    optionLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
      numberOfLines: 2,
    },
    optionLabelSelected: {
      color: colors.primary,
    },
    singleSelectContainer: {
      gap: 8,
    },
    singleOptionTile: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    singleOptionTileSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    singleOptionIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    singleOptionContent: {
      flex: 1,
    },
    singleOptionLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    singleOptionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    navigationContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    navigationButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    navButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      minHeight: 54,
    },
    prevButton: {
      backgroundColor: colors.surfaceVariant,
      borderWidth: 2,
      borderColor: colors.border,
    },
    nextButton: {
      backgroundColor: colors.primary,
    },
    navButtonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 6,
    },
    prevButtonText: {
      color: colors.text,
    },
    nextButtonText: {
      color: colors.onPrimary,
    },
    textInput: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
      minHeight: 50,
      marginTop: 8,
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      marginTop: 8,
    },
    switchLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginRight: 16,
    },
  });

  const handleAnswerChange = (questionId: string, value: any, isMultiSelect = false) => {
    setAnswers(prev => {
      if (isMultiSelect) {
        const currentValues = prev[questionId] || [];
        let newValues;
        
        if (currentValues.includes(value)) {
          newValues = currentValues.filter((v: any) => v !== value);
        } else {
          newValues = [...currentValues, value];
        }
        
        return { ...prev, [questionId]: newValues };
      } else {
        return { ...prev, [questionId]: value };
      }
    });
  };

  const goToNext = () => {
    if (currentIndex < totalSteps - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentIndex(currentIndex + 1);
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * screenWidth,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentIndex(currentIndex - 1);
      scrollViewRef.current?.scrollTo({
        x: (currentIndex - 1) * screenWidth,
        animated: true,
      });
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
        if (!isEditMode) {
          // Complete onboarding only for new users
          await UserPreferencesService.completeOnboarding();
        }
        onComplete(preferences);
      } else {
        Alert.alert('Error', result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', isEditMode ? 'Failed to update preferences' : 'Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const buildPreferencesFromAnswers = (answers: Record<string, any>): UserPersonalizationData => {
    const basePrefs = isEditMode && existingPreferences ? existingPreferences : getDefaultPreferences();
    const preferences: UserPersonalizationData = {
      ...basePrefs,
      metadata: {
        ...basePrefs.metadata,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
    };

    // Map answers to preference structure
    for (const [questionId, value] of Object.entries(answers)) {
      const question = onboardingSteps
        .flatMap(step => step.questions)
        .find(q => q.id === questionId);
      
      if (!question) continue;

      const category = question.category as keyof UserPersonalizationData;
      const key = questionId;

      if (preferences[category]) {
        (preferences[category] as any)[key] = value;
      }
    }

    return preferences;
  };

  const isStepValid = () => {
    const currentStep = onboardingSteps[currentIndex];
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

  const renderQuestion = (question: any) => {
    const answer = answers[question.id];

    return (
      <View key={question.id} style={styles.questionCard}>
        <Text style={styles.questionTitle}>{question.question}</Text>
        {question.subtitle && (
          <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
        )}

        {question.type === 'multi_select' && (
          <View style={styles.optionsGrid}>
            {question.options?.map((option: any) => {
              const isSelected = (answer || []).includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionTile,
                    isSelected && styles.optionTileSelected,
                  ]}
                  onPress={() => handleAnswerChange(question.id, option.value, true)}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <Text 
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {question.type === 'single_select' && (
          <View style={styles.singleSelectContainer}>
            {question.options?.map((option: any) => {
              const isSelected = answer === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.singleOptionTile,
                    isSelected && styles.singleOptionTileSelected,
                  ]}
                  onPress={() => handleAnswerChange(question.id, option.value)}
                >
                  <Text style={styles.singleOptionIcon}>{option.icon}</Text>
                  <View style={styles.singleOptionContent}>
                    <Text style={styles.singleOptionLabel}>{option.label}</Text>
                    {option.description && (
                      <Text style={styles.singleOptionDescription}>{option.description}</Text>
                    )}
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={isSelected ? colors.primary : colors.border}
                  />
                </TouchableOpacity>
              );
            })}
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
    <LinearGradient colors={colors.gradientBackground} style={styles.container}>
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
              {currentIndex + 1}/{totalSteps}
            </Text>
          </View>
        </View>

        {/* Carousel */}
        <Animated.View style={[styles.carouselContainer, { opacity: fadeAnim }]}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
          >
            {onboardingSteps.map((step, index) => (
              <View key={step.id} style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>
                    {isEditMode ? `Edit ${step.title}` : step.title}
                  </Text>
                  <Text style={styles.stepDescription}>
                    {isEditMode ? `Update your ${step.title.toLowerCase()} settings` : step.description}
                  </Text>
                </View>

                <ScrollView style={styles.questionsContainer} showsVerticalScrollIndicator={false}>
                  {step.questions
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
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <View style={styles.navigationButtons}>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton]}
                onPress={goToPrev}
                disabled={isLoading}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
                <Text style={[styles.navButtonText, styles.prevButtonText]}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.nextButton,
                { opacity: isStepValid() && !isLoading ? 1 : 0.6 }
              ]}
              onPress={goToNext}
              disabled={!isStepValid() || isLoading}
            >
              <Text style={[styles.navButtonText, styles.nextButtonText]}>
                {isLoading 
                  ? 'Saving...' 
                  : currentIndex === totalSteps - 1 
                    ? 'Complete' 
                    : 'Next'
                }
              </Text>
              {!isLoading && (
                <Ionicons 
                  name={currentIndex === totalSteps - 1 ? "checkmark" : "chevron-forward"} 
                  size={20} 
                  color={colors.onPrimary} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}