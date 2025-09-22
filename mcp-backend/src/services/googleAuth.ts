import { google } from 'googleapis';
import { SupabaseService } from './supabase';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

export class GoogleAuthService {
  private static oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  static getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'select_account consent',
      include_granted_scopes: false,
    });
  }

  static async exchangeCodeForTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  static async getAuthenticatedClient(userId: string) {
    try {
      // 1. Get stored tokens (access + refresh) from Supabase
      const tokens = await SupabaseService.getGoogleTokens(userId);
  
      if (!tokens?.refresh_token) {
        throw new Error("No refresh token found. User needs to re-authenticate.");
      }
  
      // 2. Attach tokens to oauth2Client
      this.oauth2Client.setCredentials(tokens);
  
      // 3. Refresh the access token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
  
      // 4. If Google sent a new refresh_token, prefer it over the old one
      const updatedTokens = {
      
        refresh_token: credentials.refresh_token || tokens.refresh_token, 
       
      };
  
      // 5. Save back to Supabase
      await SupabaseService.storeGoogleTokens(userId, updatedTokens);
  
      return this.oauth2Client;
    } catch (error) {
      console.error("getAuthenticatedClient error:", error);
      throw new Error("Failed to authenticate with Google");
    }
  }
}