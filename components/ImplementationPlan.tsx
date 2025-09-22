import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import implementationPlanService, { 
  ImplementationPlan, 
  ImplementationStep, 
  PlanProgressEvent 
} from '../services/implementationPlanService';

interface ImplementationPlanProps {
  query: string;
  context?: any;
  onComplete?: (planId: string) => void;
  autoExecute?: boolean;
}

export default function ImplementationPlanComponent({ 
  query, 
  context, 
  onComplete,
  autoExecute = true 
}: ImplementationPlanProps) {
  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [planId, setPlanId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleProgress = (event: PlanProgressEvent) => {
    console.log('📋 Implementation Plan Event:', event);
    
    switch (event.type) {
      case 'plan_generation_started':
        setCurrentMessage('🤖 Analyzing your request and generating implementation plan...');
        addLog('Started generating implementation plan');
        break;
        
      case 'plan_overview':
        setCurrentMessage(`📊 Plan Overview: ${event.overview}`);
        addLog(`Generated plan with ${event.totalSteps} steps (${event.totalEstimatedTime})`);
        if (plan) {
          setPlan(prev => prev ? {
            ...prev,
            overview: event.overview,
            totalEstimatedTime: event.totalEstimatedTime
          } : null);
        }
        break;
        
      case 'step_generated':
        if (event.step) {
          setCurrentMessage(`➕ Added step: ${event.step.title}`);
          addLog(`Generated step: ${event.step.title}`);
          setPlan(prev => {
            if (!prev) return null;
            const existingStepIndex = prev.steps.findIndex(s => s.id === event.step!.id);
            if (existingStepIndex >= 0) {
              // Update existing step
              const updatedSteps = [...prev.steps];
              updatedSteps[existingStepIndex] = { ...updatedSteps[existingStepIndex], ...event.step };
              return { ...prev, steps: updatedSteps };
            } else {
              // Add new step
              return {
                ...prev,
                steps: [...prev.steps, event.step as ImplementationStep]
              };
            }
          });
        }
        break;
        
      case 'plan_generation_complete':
        setCurrentMessage('✅ Implementation plan ready!');
        addLog('Plan generation completed');
        setIsGenerating(false);
        if (plan) {
          setPlan(prev => prev ? { ...prev, status: 'ready' } : null);
        }
        if (autoExecute && planId) {
          setTimeout(() => startExecution(), 1000);
        }
        break;
        
      case 'execution_started':
        setCurrentMessage('🚀 Starting implementation...');
        addLog('Started executing implementation plan');
        setIsExecuting(true);
        if (plan) {
          setPlan(prev => prev ? { ...prev, status: 'executing' } : null);
        }
        break;
        
      case 'step_started':
        setCurrentMessage(`⚡ ${event.step?.title || 'Working'}...`);
        addLog(`Started: ${event.step?.title}`);
        updateStepStatus(event.stepId, 'in_progress');
        break;
        
      case 'step_completed':
        setCurrentMessage(`✅ ${event.step?.title || 'Step'} completed`);
        addLog(`Completed: ${event.step?.title || event.stepId}`);
        updateStepStatus(event.stepId, 'completed', event.result);
        break;
        
      case 'step_failed':
        setCurrentMessage(`❌ ${event.step?.title || 'Step'} failed`);
        addLog(`Failed: ${event.step?.title || event.stepId} - ${event.error}`);
        updateStepStatus(event.stepId, 'failed', undefined, event.error);
        break;
        
      case 'execution_completed':
        setCurrentMessage('🎉 Implementation completed successfully!');
        addLog('Implementation plan execution completed');
        setIsExecuting(false);
        if (plan) {
          setPlan(prev => prev ? { ...prev, status: 'completed' } : null);
        }
        if (onComplete && planId) {
          onComplete(planId);
        }
        break;
        
      case 'execution_completed_with_errors':
        setCurrentMessage('⚠️ Implementation completed with some issues');
        addLog(`Implementation completed with errors: ${event.message}`);
        setIsExecuting(false);
        if (plan) {
          setPlan(prev => prev ? { ...prev, status: 'completed' } : null);
        }
        break;
        
      case 'plan_generation_error':
      case 'execution_error':
        setCurrentMessage(`❌ Error: ${event.error}`);
        addLog(`Error: ${event.error}`);
        setIsGenerating(false);
        setIsExecuting(false);
        Alert.alert('Error', event.error || 'An error occurred');
        break;
    }
  };

  const updateStepStatus = (
    stepId: string | undefined, 
    status: ImplementationStep['status'],
    result?: any,
    error?: string
  ) => {
    if (!stepId) return;
    
    setPlan(prev => {
      if (!prev) return null;
      const updatedSteps = prev.steps.map(step => 
        step.id === stepId 
          ? { ...step, status, result, error }
          : step
      );
      return { ...prev, steps: updatedSteps };
    });
  };

  const generatePlan = async () => {
    try {
      setIsGenerating(true);
      setPlan({
        id: '',
        query,
        context,
        steps: [],
        status: 'generating'
      });
      
      const generatedPlanId = await implementationPlanService.generatePlan(
        query,
        context,
        handleProgress
      );
      
      setPlanId(generatedPlanId);
    } catch (error) {
      console.error('Failed to generate plan:', error);
      setIsGenerating(false);
      Alert.alert('Error', 'Failed to generate implementation plan');
    }
  };

  const startExecution = async () => {
    if (!planId) return;
    
    try {
      await implementationPlanService.executePlan(planId, handleProgress);
    } catch (error) {
      console.error('Failed to execute plan:', error);
      Alert.alert('Error', 'Failed to execute implementation plan');
    }
  };

  useEffect(() => {
    if (query) {
      generatePlan();
    }
  }, [query]);

  const getStepIcon = (status: ImplementationStep['status']) => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
      case 'in_progress':
        return <ActivityIndicator size="small" color="#2196F3" />;
      case 'failed':
        return <Ionicons name="close-circle" size={20} color="#F44336" />;
      default:
        return <Ionicons name="ellipse-outline" size={20} color="#757575" />;
    }
  };

  const getStepStatusText = (status: ImplementationStep['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list-outline" size={24} color="#2196F3" />
        <Text style={styles.title}>Implementation Plan</Text>
      </View>

      {/* Current Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          {(isGenerating || isExecuting) && (
            <ActivityIndicator size="small" color="#2196F3" style={styles.statusIcon} />
          )}
          <Text style={styles.statusText}>{currentMessage}</Text>
        </View>
      </View>

      {/* Plan Overview */}
      {plan?.overview && (
        <View style={styles.overviewContainer}>
          <Text style={styles.overviewTitle}>Overview</Text>
          <Text style={styles.overviewText}>{plan.overview}</Text>
          {plan.totalEstimatedTime && (
            <Text style={styles.estimatedTime}>⏱️ Estimated time: {plan.totalEstimatedTime}</Text>
          )}
        </View>
      )}

      {/* Steps */}
      {plan && plan.steps.length > 0 && (
        <ScrollView style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Implementation Steps</Text>
          {plan.steps.map((step, index) => (
            <View key={step.id} style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View style={styles.stepLeft}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                  {getStepIcon(step.status)}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepStatus}>{getStepStatusText(step.status)}</Text>
                </View>
                {step.estimatedTime && (
                  <Text style={styles.stepTime}>{step.estimatedTime}</Text>
                )}
              </View>
              
              <Text style={styles.stepDescription}>{step.description}</Text>
              
              {step.toolsRequired && step.toolsRequired.length > 0 && (
                <View style={styles.toolsContainer}>
                  <Text style={styles.toolsLabel}>Tools: </Text>
                  <Text style={styles.toolsText}>{step.toolsRequired.join(', ')}</Text>
                </View>
              )}
              
              {step.error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={16} color="#F44336" />
                  <Text style={styles.errorText}>{step.error}</Text>
                </View>
              )}
              
              {step.result && step.result.message && (
                <View style={styles.resultContainer}>
                  <Text style={styles.resultText}>{step.result.message}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Manual Execute Button */}
      {!autoExecute && plan?.status === 'ready' && !isExecuting && (
        <TouchableOpacity style={styles.executeButton} onPress={startExecution}>
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.executeButtonText}>Start Implementation</Text>
        </TouchableOpacity>
      )}

      {/* Logs (collapsible) */}
      {logs.length > 0 && (
        <View style={styles.logsContainer}>
          <TouchableOpacity 
            style={styles.logsHeader}
            onPress={() => {/* Toggle logs visibility */}}
          >
            <Ionicons name="terminal" size={16} color="#666" />
            <Text style={styles.logsTitle}>Logs ({logs.length})</Text>
          </TouchableOpacity>
          {/* For now, always show recent logs */}
          <ScrollView style={styles.logsContent} nestedScrollEnabled>
            {logs.slice(-5).map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    maxHeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  overviewContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  overviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  estimatedTime: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  stepsContainer: {
    flex: 1,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E0E0E0',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginRight: 8,
    minWidth: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stepStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  stepTime: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  stepDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  toolsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  toolsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  toolsText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 4,
    flex: 1,
  },
  resultContainer: {
    backgroundColor: '#E8F5E8',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  resultText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  executeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  logsContainer: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 120,
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logsTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  logsContent: {
    maxHeight: 80,
  },
  logText: {
    fontSize: 11,
    color: '#666',
    padding: 4,
    paddingHorizontal: 8,
    fontFamily: 'monospace',
  },
});