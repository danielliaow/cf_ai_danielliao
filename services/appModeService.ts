import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppMode = 'typing' | 'speech';

export interface AppModePreferences {
  defaultMode: AppMode;
  autoStartSpeech: boolean;
  lastUpdated: string;
}

export class AppModeService {
  private static readonly APP_MODE_KEY = 'app_mode_preferences';
  
  private static defaultPreferences: AppModePreferences = {
    defaultMode: 'typing',
    autoStartSpeech: false,
    lastUpdated: new Date().toISOString()
  };

  /**
   * Get current app mode preferences
   */
  static async getAppModePreferences(): Promise<AppModePreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.APP_MODE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored) as AppModePreferences;
        console.log('📱 Loaded app mode preferences:', preferences);
        return preferences;
      }
      
      // Return and save default preferences
      await this.saveAppModePreferences(this.defaultPreferences);
      console.log('📱 Using default app mode preferences');
      return this.defaultPreferences;
      
    } catch (error) {
      console.error('❌ Error loading app mode preferences:', error);
      return this.defaultPreferences;
    }
  }

  /**
   * Save app mode preferences
   */
  static async saveAppModePreferences(preferences: AppModePreferences): Promise<void> {
    try {
      const updatedPreferences = {
        ...preferences,
        lastUpdated: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(this.APP_MODE_KEY, JSON.stringify(updatedPreferences));
      console.log('💾 Saved app mode preferences:', updatedPreferences);
      
    } catch (error) {
      console.error('❌ Error saving app mode preferences:', error);
      throw error;
    }
  }

  /**
   * Set default app mode (typing or speech)
   */
  static async setDefaultMode(mode: AppMode): Promise<void> {
    try {
      const current = await this.getAppModePreferences();
      await this.saveAppModePreferences({
        ...current,
        defaultMode: mode
      });
      console.log(`🎯 Default app mode set to: ${mode}`);
    } catch (error) {
      console.error('❌ Error setting default mode:', error);
      throw error;
    }
  }

  /**
   * Toggle auto-start speech mode
   */
  static async setAutoStartSpeech(enabled: boolean): Promise<void> {
    try {
      const current = await this.getAppModePreferences();
      await this.saveAppModePreferences({
        ...current,
        autoStartSpeech: enabled
      });
      console.log(`🎤 Auto-start speech mode set to: ${enabled}`);
    } catch (error) {
      console.error('❌ Error setting auto-start speech:', error);
      throw error;
    }
  }

  /**
   * Check if app should auto-start in speech mode
   */
  static async shouldAutoStartSpeech(): Promise<boolean> {
    try {
      const preferences = await this.getAppModePreferences();
      return preferences.defaultMode === 'speech' && preferences.autoStartSpeech;
    } catch (error) {
      console.error('❌ Error checking auto-start speech:', error);
      return false;
    }
  }

  /**
   * Reset to default preferences
   */
  static async resetToDefault(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.APP_MODE_KEY);
      console.log('🔄 Reset app mode preferences to default');
    } catch (error) {
      console.error('❌ Error resetting app mode preferences:', error);
      throw error;
    }
  }
}