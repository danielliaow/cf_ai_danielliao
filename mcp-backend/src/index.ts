// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { registerAllTools } from './services/tools';
import { AIController } from './controllers/aiController';

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - configure for development
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? true : false
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [
  '*',
  'http://localhost:3000', 
  'http://localhost:8081', 
  'http://localhost:19000',
  'http://localhost:19006', // Expo web default port
  'http://127.0.0.1:19006',
  'exp://localhost:19000',
  'exp://127.0.0.1:19000',
  'http://localhost:8084',
];

console.log('🌐 CORS Origins:', corsOrigins);
console.log(process.env.NODE_ENV);
app.use(cors({
  origin: (origin, callback) => {
    console.log(origin,'its origin')
    console.log(process.env.NODE_ENV === 'development','fjiutgiehgiuehrgiuhetgiuhtughg')
    console.log('🌐 CORS request from origin:', origin);
    if (process.env.NODE_ENV === 'development') {
      console.log("from devs ori")
      callback(null, true); // Allow all origins in development
    } else {
      callback(null, corsOrigins.includes(origin || ''));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'x-user-context',
    'Accept',
    'x-timezone',
    'Origin'
  ],
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Register MCP tools
console.log('Registering MCP tools...');
registerAllTools();

// Initialize AI Service (optional - will disable AI features if GEMINI_API_KEY is missing)
console.log('Initializing AI Service...');
AIController.initializeAI().catch(error => {
  console.warn('⚠️ AI Service initialization failed - AI features will be disabled:', error.message);
});

// Routes
app.use('/api', routes);

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler (temporarily disabled to fix routing issue)
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     error: 'Endpoint not found',
//     timestamp: new Date().toISOString(),
//   });
// });

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MCP Orchestrator Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});