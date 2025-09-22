import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import aiService from '../services/aiService';
import ImplementationPlanComponent from './ImplementationPlan';

interface ChatWithImplementationPlanProps {
  message: string;
  onComplete?: () => void;
}

export default function ChatWithImplementationPlan({ 
  message, 
  onComplete 
}: ChatWithImplementationPlanProps) {
  const [showImplementationPlan, setShowImplementationPlan] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeMessage = async () => {
    try {
      setIsAnalyzing(true);
      
      const response = await aiService.query(message, {
        includeRawData: true,
        responseStyle: 'detailed'
      });

      console.log('AI Response:', response);
      setAiResponse(response);

      // Check if this requires an implementation plan
      if (response.requiresImplementationPlan) {
        setShowImplementationPlan(true);
      } else {
        // Handle normal response
        Alert.alert('Response', response.response);
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
      Alert.alert('Error', 'Failed to analyze your request');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlanComplete = (planId: string) => {
    console.log('Implementation plan completed:', planId);
    setShowImplementationPlan(false);
    if (onComplete) onComplete();
  };

  if (showImplementationPlan && aiResponse?.taskComplexity) {
    return (
      <ImplementationPlanComponent
        query={message}
        context={aiResponse.taskComplexity}
        onComplete={handlePlanComplete}
        autoExecute={true}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>"{message}"</Text>
      </View>

      <TouchableOpacity 
        style={[styles.analyzeButton, isAnalyzing && styles.analyzingButton]} 
        onPress={analyzeMessage}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? (
          <>
            <Ionicons name="refresh" size={20} color="#fff" style={styles.spinIcon} />
            <Text style={styles.buttonText}>Analyzing...</Text>
          </>
        ) : (
          <>
            <Ionicons name="analytics" size={20} color="#fff" />
            <Text style={styles.buttonText}>Analyze & Execute</Text>
          </>
        )}
      </TouchableOpacity>

      {aiResponse && !aiResponse.requiresImplementationPlan && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Response:</Text>
          <Text style={styles.responseText}>{aiResponse.response}</Text>
          
          {aiResponse.reasoning && (
            <>
              <Text style={styles.reasoningLabel}>Reasoning:</Text>
              <Text style={styles.reasoningText}>{aiResponse.reasoning}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    margin: 16,
  },
  messageContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  messageText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#333',
    lineHeight: 22,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  analyzingButton: {
    backgroundColor: '#666',
  },
  spinIcon: {
    // Add animation later
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  responseContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});