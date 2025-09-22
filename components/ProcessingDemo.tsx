import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatWithProcessingTab from './ChatWithProcessingTab';

const DEMO_SCENARIOS = [
  {
    id: 'email-summary-drive',
    title: '📧 Email Summary to Drive',
    description: 'Complex multi-step workflow',
    query: 'Get my emails from today, create a comprehensive summary with key insights, and save it to my Google Drive as a document',
    complexity: 'High',
    expectedSteps: [
      'Analyze task complexity',
      'Generate implementation plan',
      'Fetch today\'s emails',
      'Analyze email content',
      'Generate comprehensive summary',
      'Create Google Drive document',
      'Save and verify completion'
    ]
  },
  {
    id: 'calendar-productivity',
    title: '📅 Calendar Productivity Setup',
    description: 'Multi-system integration',
    query: 'Analyze my calendar for this week, identify productivity patterns, create recommendations, and set up automated reminders for optimal work blocks',
    complexity: 'Very High',
    expectedSteps: [
      'Fetch calendar data for the week',
      'Analyze meeting patterns and gaps',
      'Identify productivity time blocks',
      'Generate optimization recommendations',
      'Create automated reminder workflow',
      'Set up recurring productivity blocks'
    ]
  },
  {
    id: 'research-report',
    title: '🔍 Research & Report Generation',
    description: 'Research, analysis, and documentation',
    query: 'Research the latest trends in AI development, analyze the findings, create a detailed report with actionable recommendations, and schedule a review meeting',
    complexity: 'Very High',
    expectedSteps: [
      'Research AI development trends',
      'Collect and filter relevant information',
      'Analyze findings and extract insights',
      'Generate structured report',
      'Create actionable recommendations',
      'Schedule follow-up meeting',
      'Save report to Drive'
    ]
  },
  {
    id: 'simple-email-check',
    title: '📮 Simple Email Check',
    description: 'Single API call - no implementation plan needed',
    query: 'Check my emails from today',
    complexity: 'Low',
    expectedSteps: [
      'Direct tool execution: getEmails',
      'Generate natural language response'
    ]
  }
];

export default function ProcessingDemo() {
  const [selectedScenario, setSelectedScenario] = useState<typeof DEMO_SCENARIOS[0] | null>(null);
  const [showChat, setShowChat] = useState(false);

  const handleScenarioSelect = (scenario: typeof DEMO_SCENARIOS[0]) => {
    setSelectedScenario(scenario);
    setShowChat(true);
  };

  const handleBackToScenarios = () => {
    setShowChat(false);
    setSelectedScenario(null);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Low': return '#4CAF50';
      case 'High': return '#FF9800';
      case 'Very High': return '#F44336';
      default: return '#666';
    }
  };

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'Low': return 'flash';
      case 'High': return 'layers';
      case 'Very High': return 'git-network';
      default: return 'help-circle';
    }
  };

  if (showChat && selectedScenario) {
    return (
      <View style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToScenarios}
          >
            <Ionicons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <View style={styles.scenarioInfo}>
            <Text style={styles.scenarioTitle}>{selectedScenario.title}</Text>
            <Text style={styles.scenarioDescription}>{selectedScenario.description}</Text>
          </View>
        </View>
        
        <ChatWithProcessingTab />
        
        {/* Pre-fill the query */}
        <View style={styles.queryPreview}>
          <Text style={styles.queryPreviewLabel}>Demo Query:</Text>
          <Text style={styles.queryPreviewText}>"{selectedScenario.query}"</Text>
          <Text style={styles.queryPreviewHint}>
            Tap the send button or modify the query above
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚀 Processing Tab Demo</Text>
        <Text style={styles.subtitle}>
          Experience real-time tool execution and implementation plans
        </Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.infoTitle}>What You'll See</Text>
        </View>
        <View style={styles.infoContent}>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>🧠</Text>
            <Text style={styles.infoText}>AI analyzes query complexity automatically</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>📋</Text>
            <Text style={styles.infoText}>Implementation plans stream in real-time</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>🔧</Text>
            <Text style={styles.infoText}>Tools execute with live progress updates</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>📊</Text>
            <Text style={styles.infoText}>Full processing history with no truncation</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>⚡</Text>
            <Text style={styles.infoText}>Continuous streaming until completion</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Choose a Demo Scenario</Text>

      {DEMO_SCENARIOS.map((scenario) => (
        <TouchableOpacity
          key={scenario.id}
          style={styles.scenarioCard}
          onPress={() => handleScenarioSelect(scenario)}
        >
          <View style={styles.scenarioHeader}>
            <Text style={styles.scenarioCardTitle}>{scenario.title}</Text>
            <View style={[
              styles.complexityBadge,
              { backgroundColor: getComplexityColor(scenario.complexity) + '20' }
            ]}>
              <Ionicons 
                name={getComplexityIcon(scenario.complexity)} 
                size={12} 
                color={getComplexityColor(scenario.complexity)} 
              />
              <Text style={[
                styles.complexityText,
                { color: getComplexityColor(scenario.complexity) }
              ]}>
                {scenario.complexity}
              </Text>
            </View>
          </View>
          
          <Text style={styles.scenarioCardDescription}>{scenario.description}</Text>
          
          <View style={styles.queryPreviewCard}>
            <Text style={styles.queryPreviewCardText}>"{scenario.query}"</Text>
          </View>
          
          <View style={styles.expectedSteps}>
            <Text style={styles.expectedStepsTitle}>Expected Processing Steps:</Text>
            {scenario.expectedSteps.map((step, index) => (
              <Text key={index} style={styles.expectedStep}>
                {index + 1}. {step}
              </Text>
            ))}
          </View>

          <View style={styles.scenarioFooter}>
            <Ionicons name="play-circle" size={16} color="#2196F3" />
            <Text style={styles.tryText}>Try This Scenario</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.noteCard}>
        <Ionicons name="rocket" size={20} color="#4CAF50" />
        <View style={styles.noteContent}>
          <Text style={styles.noteTitle}>Ready for Real Processing!</Text>
          <Text style={styles.noteText}>
            This demo connects to your actual backend services. 
            Complex queries will generate real implementation plans and execute actual tools.
          </Text>
        </View>
      </View>

      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>✨ Key Features</Text>
        <View style={styles.featuresList}>
          <Text style={styles.feature}>• Real-time streaming with no message truncation</Text>
          <Text style={styles.feature}>• Visual processing tab instead of chat messages</Text>
          <Text style={styles.feature}>• Automatic implementation plan generation</Text>
          <Text style={styles.feature}>• Live tool execution monitoring</Text>
          <Text style={styles.feature}>• Continuous streaming until completion</Text>
          <Text style={styles.feature}>• Expandable event details and logs</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  scenarioDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  queryPreview: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  queryPreviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  queryPreviewText: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  queryPreviewHint: {
    fontSize: 10,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoContent: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoStep: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  scenarioCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  complexityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  complexityText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  scenarioCardDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  queryPreviewCard: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  queryPreviewCardText: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  expectedSteps: {
    marginBottom: 12,
  },
  expectedStepsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  expectedStep: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
    paddingLeft: 8,
  },
  scenarioFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tryText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 6,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E8',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  noteContent: {
    marginLeft: 12,
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
  featuresCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  featuresList: {
    marginTop: 4,
  },
  feature: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
});