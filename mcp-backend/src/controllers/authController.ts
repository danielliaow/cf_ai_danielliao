import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { GoogleAuthService } from '../services/googleAuth';
import { SupabaseService } from '../services/supabase';

export class AuthController {
  static async getGoogleAuthUrl(req: Request, res: Response): Promise<void> {
    try {
      const authUrl = GoogleAuthService.getAuthUrl();
      
      res.json({
        success: true,
        data: {
          authUrl,
          message: 'Visit this URL to authorize Google Workspace access',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate authorization URL',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async handleGoogleCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Authorization code is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Exchange code for tokens
      const tokens = await GoogleAuthService.exchangeCodeForTokens(code);
      
      // Store tokens for the authenticated user
      await SupabaseService.storeGoogleTokens(req.user.id, tokens);

      res.json({
        success: true,
        data: {
          message: 'Google Workspace successfully connected',
          scopes: tokens.scope?.split(' ') || [],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling Google callback:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process Google authorization',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getAuthStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let googleConnected = false;
      let googleScopes: string[] = [];

      try {
        const tokens = await SupabaseService.getGoogleTokens(req.user.id);
        console.log(tokens,"tokens form backend")
        googleConnected = true;

        googleScopes = tokens.scope?.split(' ') || [];
        
      } catch (error) {
        // User hasn't connected Google yet
        googleConnected = false;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
          },
          googleWorkspace: {
            connected: googleConnected,
            scopes: googleScopes,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting auth status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get authentication status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async revokeGoogleAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // In a production app, you'd also revoke the token with Google
      // For now, just remove from our database
      await SupabaseService.storeGoogleTokens(req.user.id, {
        access_token: '',
        refresh_token: '',
        scope: '',
        token_type: '',
        expiry_date: 0,
      });

      res.json({
        success: true,
        data: {
          message: 'Google Workspace access revoked',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error revoking Google access:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke Google access',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async syncGoogleTokens(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { googleTokens } = req.body;

      if (!googleTokens) {
        res.status(400).json({
          success: false,
          error: 'Google tokens are required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log('📥 Syncing Google tokens for user:', req.user.email);
      console.log('🔑 Token data received:', {
        hasAccessToken: !!googleTokens.access_token,
        hasRefreshToken: !!googleTokens.refresh_token,
        hasProviderToken: !!googleTokens.provider_token,
        expires: googleTokens.expires_at ? new Date(googleTokens.expires_at * 1000).toISOString() : 'unknown'
      });

      // Convert frontend tokens to backend format
      const backendTokens = {
        access_token: googleTokens.provider_token || googleTokens.access_token,
        refresh_token: googleTokens.provider_refresh_token || googleTokens.refresh_token,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
        expiry_date: googleTokens.expires_at ? googleTokens.expires_at * 1000 : Date.now() + 3600000,
      };

      // Store tokens for the authenticated user
      await SupabaseService.storeGoogleTokens(req.user.id, backendTokens);

      console.log('✅ Google tokens synced successfully for user:', req.user.email);

      res.json({
        success: true,
        data: {
          message: 'Google tokens synced successfully',
          scopes: backendTokens.scope.split(' '),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error syncing Google tokens:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync Google tokens',
        timestamp: new Date().toISOString(),
      });
    }
  }
}