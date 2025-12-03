import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/environment';
import { prisma, disconnectDatabase, isDatabaseConnected } from './config/database';
import { logger } from './utils/logger';
import { heartbeatService } from './services/heartbeat.service';
import { accountMonitorService } from './services/account-monitor.service';
import { deathClaimProcessorService } from './services/death-claim-processor.service';

// Import routes
import authRoutes from './routes/auth.routes';
import heartbeatRoutes from './routes/heartbeat.routes';
import beneficiaryRoutes from './routes/beneficiary.routes';
import registrationRoutes from './routes/registration.routes';
import accountRoutes from './routes/account.routes';
import twofaRoutes from './routes/twofa.routes';

// Validate environment configuration
try {
  validateConfig();
} catch (error: any) {
  logger.error('Configuration error:', error.message);
  process.exit(1);
}

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbConnected = await isDatabaseConnected();

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/2fa', twofaRoutes);
app.use('/api/heartbeat', heartbeatRoutes);
app.use('/api/beneficiary', beneficiaryRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: config.nodeEnv === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await isDatabaseConnected();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Start heartbeat monitoring service
    heartbeatService.start();

    // Start account monitoring service
    accountMonitorService.start();

    // Start death claim processor service
    deathClaimProcessorService.start();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 EternLink Backend Server started`, {
        port: config.port,
        environment: config.nodeEnv,
        frontendUrl: config.frontendUrl,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Stop heartbeat service
        heartbeatService.stop();

        // Stop account monitor service
        accountMonitorService.stop();

        // Stop death claim processor service
        deathClaimProcessorService.stop();

        // Disconnect database
        await disconnectDatabase();
        logger.info('Database disconnected');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
