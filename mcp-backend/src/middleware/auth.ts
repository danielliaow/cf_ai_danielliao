import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { SupabaseService } from '../services/supabase';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth middleware - Token present:', !!token);
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');

    if (!token) {
      console.log('❌ No token provided');
      res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      console.log('🔍 Verifying token...');
      const user = await SupabaseService.verifyToken(token);
      console.log('✅ Token verified for user:', user.email);
      req.user = user;
      next();
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  } catch (error) {
    console.error('💥 Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
    return;
  }
};

export const requireGoogleAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if user has Google tokens
    try {
      await SupabaseService.getGoogleTokens(req.user.id);
      next();
    } catch (error) {
      res.status(403).json({
        success: false,
        error: 'Google Workspace authorization required. Please connect your Google account first.',
        authUrl: '/auth/google',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  } catch (error) {
    console.error('Google auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
    return;
  }
};