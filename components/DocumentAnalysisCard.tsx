import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DocumentAnalysisResult } from '../types/chat';

interface DocumentAnalysisCardProps {
  result: DocumentAnalysisResult;
  onViewFullDocument?: () => void;
}

export const DocumentAnalysisCard: React.FC<DocumentAnalysisCardProps> = ({
  result,
  onViewFullDocument
}) => {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    errorCard: {
      borderColor: colors.error + '40',
      backgroundColor: colors.error + '10',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 8,
      flex: 1,
    },
    viewButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.primary + '20',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
      padding: 12,
    },
    stat: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    section: {
      marginBottom: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    toggleButton: {
      padding: 4,
      borderRadius: 4,
    },
    sectionContent: {
      paddingLeft: 16,
      paddingTop: 8,
    },
    summaryText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    keywordsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    keyword: {
      backgroundColor: colors.primary + '20',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    keywordText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    sentimentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sentimentScore: {
      fontSize: 14,
      fontWeight: '600',
    },
    sentimentLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    errorText: {
      fontSize: 14,
      color: colors.error,
    },
    structureItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    structureKey: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    structureValue: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500',
    },
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const getSentimentColor = (score?: number) => {
    if (!score) return colors.textSecondary;
    if (score > 0.2) return colors.success;
    if (score < -0.2) return colors.error;
    return colors.warning;
  };

  const getSentimentLabel = (score?: number) => {
    if (!score) return 'Neutral';
    if (score > 0.5) return 'Very Positive';
    if (score > 0.2) return 'Positive';
    if (score < -0.5) return 'Very Negative';
    if (score < -0.2) return 'Negative';
    return 'Neutral';
  };

  const formatReadingTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.round(minutes % 60);
    return `${hours}h ${remainingMins}m`;
  };

  if (!result.success) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={[styles.title, { color: colors.error }]}>
              Document Analysis Failed
            </Text>
          </View>
        </View>
        <Text style={styles.errorText}>{result.error || 'Unknown error occurred'}</Text>
      </View>
    );
  }

  const { operations, statistics } = result.data!;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="analytics" size={20} color={colors.primary} />
          <Text style={styles.title}>Document Analysis</Text>
        </View>
        
        {onViewFullDocument && (
          <TouchableOpacity style={styles.viewButton} onPress={onViewFullDocument}>
            <MaterialIcons name="open-in-full" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Statistics Row */}
      {statistics && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{statistics.wordCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{statistics.characterCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Characters</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{statistics.paragraphCount}</Text>
            <Text style={styles.statLabel}>Paragraphs</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatReadingTime(statistics.estimatedReadingTime)}
            </Text>
            <Text style={styles.statLabel}>Reading Time</Text>
          </View>
        </View>
      )}

      <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
        {/* Summary Section */}
        {operations.summary && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('summary')}
            >
              <Text style={styles.sectionTitle}>Summary</Text>
              <TouchableOpacity style={styles.toggleButton}>
                <MaterialIcons
                  name={expandedSections.summary ? 'expand-less' : 'expand-more'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
            {expandedSections.summary && (
              <View style={styles.sectionContent}>
                <Text style={styles.summaryText}>{operations.summary}</Text>
              </View>
            )}
          </View>
        )}

        {/* Keywords Section */}
        {operations.keywords && operations.keywords.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('keywords')}
            >
              <Text style={styles.sectionTitle}>
                Keywords ({operations.keywords.length})
              </Text>
              <TouchableOpacity style={styles.toggleButton}>
                <MaterialIcons
                  name={expandedSections.keywords ? 'expand-less' : 'expand-more'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
            {expandedSections.keywords && (
              <View style={styles.sectionContent}>
                <View style={styles.keywordsContainer}>
                  {operations.keywords.map((keyword, index) => (
                    <View key={index} style={styles.keyword}>
                      <Text style={styles.keywordText}>{keyword}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Sentiment Section */}
        {operations.sentiment && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('sentiment')}
            >
              <Text style={styles.sectionTitle}>Sentiment Analysis</Text>
              <TouchableOpacity style={styles.toggleButton}>
                <MaterialIcons
                  name={expandedSections.sentiment ? 'expand-less' : 'expand-more'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
            {expandedSections.sentiment && (
              <View style={styles.sectionContent}>
                <View style={styles.sentimentContainer}>
                  <Text
                    style={[
                      styles.sentimentScore,
                      { color: getSentimentColor(operations.sentiment.score) }
                    ]}
                  >
                    {(operations.sentiment.score * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.sentimentLabel}>
                    {getSentimentLabel(operations.sentiment.score)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Structure Section */}
        {operations.structure && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('structure')}
            >
              <Text style={styles.sectionTitle}>Document Structure</Text>
              <TouchableOpacity style={styles.toggleButton}>
                <MaterialIcons
                  name={expandedSections.structure ? 'expand-less' : 'expand-more'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
            {expandedSections.structure && (
              <View style={styles.sectionContent}>
                {Object.entries(operations.structure).map(([key, value]) => (
                  <View key={key} style={styles.structureItem}>
                    <Text style={styles.structureKey}>{key}:</Text>
                    <Text style={styles.structureValue}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};