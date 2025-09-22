import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function AuthDebug() {
  const { user, session, loading } = useAuth();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Debug Info</Text>
      <Text>Loading: {loading ? 'Yes' : 'No'}</Text>
      <Text>User: {user ? user.email : 'None'}</Text>
      <Text>Session: {session ? 'Present' : 'None'}</Text>
      <Text>User ID: {user?.id || 'None'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});