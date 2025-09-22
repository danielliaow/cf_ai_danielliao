import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatWithImplementationPlan from './ChatWithImplementationPlan';

const DEMO_QUERIES = [
  {
    id: 1,
    title: 'Email Summary to Drive',
    query: 'Get my emails from today, create a comprehensive summary, and save it to my Google Drive',
    description: 'Multi-step task: Fetch emails → Analyze content → Create document → Save to Drive',
    complexity: 'Complex (4+ steps)',
  },
  {
    id: 2,
    title: 'Research & Report',
    query: 'Research the latest AI trends, analyze the data, create a detailed report with recommendations, and schedule a meeting to discuss',
    description: 'Multi-step workflow: Research → Analysis → Document creation → Calendar integration',
    complexity: 'Very Complex (6+ steps)',
  },
  {
    id: 3,
    title: 'Simple Email Check',
    query: 'Check my emails from today',
    description: 'Single API call, no implementation plan needed',
    complexity: 'Simple (1 step)',
  },
  {
    id: 4,
    title: 'Calendar Analysis & Setup',
    query: 'Analyze my calendar for this week, identify free slots, create a productivity schedule, and set up recurring reminders',
    description: 'Complex workflow: Calendar analysis → Schedule optimization → Recurring setup',
    complexity: 'Complex (5+ steps)',
  },
];

export default function ImplementationPlanDemo() {
  const [selectedQuery, setSelectedQuery] = useState<typeof DEMO_QUERIES[0] | null>(null);

  const handleQuerySelect = (query: typeof DEMO_QUERIES[0]) => {
    setSelectedQuery(query);
  };

  const handleDemoComplete = () => {
    Alert.alert(
      'Demo Complete',
      'The implementation plan has finished executing. In a real app, the results would be saved and the user would be notified.',
      [{ text: 'OK', onPress: () => setSelectedQuery(null) }]
    );
  };

  const resetDemo = () => {
    setSelectedQuery(null);
  };

  if (selectedQuery) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={resetDemo}>
            <Ionicons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedQuery.title}</Text>
            <Text style={styles.headerComplexity}>{selectedQuery.complexity}</Text>
          </View>
        </View>
        
        <ChatWithImplementationPlan
          message={selectedQuery.query}
          onComplete={handleDemoComplete}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Implementation Plan Demo</Text>
          <Text style={styles.headerSubtitle}>
            Test how complex queries automatically generate and execute implementation plans
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.infoTitle}>How it Works</Text>
        </View>
        <Text style={styles.infoText}>
          When you submit a complex query, the AI automatically detects if it requires multiple steps and:
        </Text>
        <View style={styles.infoSteps}>
          <Text style={styles.infoStep}>1. 🧠 Analyzes task complexity</Text>
          <Text style={styles.infoStep}>2. 📋 Generates step-by-step plan</Text>
          <Text style={styles.infoStep}>3. ⚡ Executes each step automatically</Text>
          <Text style={styles.infoStep}>4. 📊 Shows real-time progress</Text>
          <Text style={styles.infoStep}>5. ✅ Delivers final results</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Try These Examples</Text>

      {DEMO_QUERIES.map((query) => (
        <TouchableOpacity
          key={query.id}
          style={styles.queryCard}
          onPress={() => handleQuerySelect(query)}
        >
          <View style={styles.queryHeader}>
            <Text style={styles.queryTitle}>{query.title}</Text>
            <View style={[
              styles.complexityBadge,
              query.complexity.includes('Simple') && styles.simpleBadge,
              query.complexity.includes('Complex') && !query.complexity.includes('Very') && styles.complexBadge,
              query.complexity.includes('Very Complex') && styles.veryComplexBadge,
            ]}>
              <Text style={styles.complexityText}>{query.complexity}</Text>
            </View>
          </View>
          
          <Text style={styles.queryText}>"{query.query}"</Text>
          <Text style={styles.queryDescription}>{query.description}</Text>
          
          <View style={styles.queryFooter}>
            <Ionicons name="play-circle" size={16} color="#2196F3" />
            <Text style={styles.tryText}>Tap to try</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.noteCard}>
        <Ionicons name="bulb" size={20} color="#FF9800" />
        <Text style={styles.noteText}>
          <Text style={styles.noteTitle}>Note: </Text>
          This is a demonstration of the implementation plan system. 
          In the real app, it would execute actual API calls and perform real operations.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerComplexity: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
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
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoSteps: {
    paddingLeft: 8,
  },
  infoStep: {
    fontSize: 14,
    color: '#555',
    marginVertical: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  queryCard: {
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
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  queryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  complexityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  simpleBadge: {
    backgroundColor: '#E8F5E8',
  },
  complexBadge: {
    backgroundColor: '#FFF3E0',
  },
  veryComplexBadge: {
    backgroundColor: '#FFEBEE',
  },
  complexityText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#333',
  },
  queryText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 6,
  },
  queryDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 12,
  },
  queryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tryText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    marginLeft: 4,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBF0',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  noteTitle: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
});