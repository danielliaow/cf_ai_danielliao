import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

type Theme = 'light' | 'dark';

interface ThemeColors {
  // Primary Embr Colors (Fire theme)
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  
  // Background Colors
  background: string;
  surface: string;
  surfaceVariant: string;
  
  // Text Colors
  text: string;
  textSecondary: string;
  textOnSurface: string;
  
  // UI Elements
  border: string;
  shadow: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  
  // Gradients
  gradientPrimary: string[];
  gradientSecondary: string[];
  gradientBackground: string[];
}

const lightTheme: ThemeColors = {
  // Embr Fire Colors - Light Mode
  primary: '#FF6B35', // Vibrant orange-red (fire)
  primaryDark: '#E55A2B',
  primaryLight: '#FF8A5C',
  secondary: '#FF9500', // Bright orange
  accent: '#FFD60A', // Golden yellow
  
  // Backgrounds
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  
  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textOnSurface: '#2C2C2C',
  
  // UI Elements
  border: '#E0E0E0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  error: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  info: '#17A2B8',
  
  // Gradients
  gradientPrimary: ['#FF6B35', '#FF9500'],
  gradientSecondary: ['#FF9500', '#FFD60A'],
  gradientBackground: ['#FAFAFA', '#F0F0F0'],
};

const darkTheme: ThemeColors = {
  // Embr Fire Colors - Dark Mode
  primary: '#FF6B35', // Keep fire colors vibrant in dark
  primaryDark: '#E55A2B',
  primaryLight: '#FF8A5C',
  secondary: '#FF9500',
  accent: '#FFD60A',
  
  // Dark Backgrounds
  background: '#0D1117', // GitHub-like dark
  surface: '#161B22',
  surfaceVariant: '#21262D',
  
  // Dark Text
  text: '#F0F6FC',
  textSecondary: '#8B949E',
  textOnSurface: '#E6EDF3',
  
  // Dark UI Elements
  border: '#30363D',
  shadow: 'rgba(0, 0, 0, 0.3)',
  error: '#F85149',
  success: '#3FB950',
  warning: '#D29922',
  info: '#58A6FF',
  
  // Dark Gradients
  gradientPrimary: ['#FF6B35', '#FF9500'],
  gradientSecondary: ['#FF9500', '#FFD60A'],
  gradientBackground: ['#0D1117', '#161B22'],
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const THEME_STORAGE_KEY = 'embr_theme';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark mode

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme as Theme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        isDark,
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
};