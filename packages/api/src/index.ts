import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from './config/index.js';
import { auth } from './lib/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initRedis, closeRedis } from './lib/redis.js';
import { initRabbitMQ, closeRabbitMQ } from './lib/queue.js';
import { initBull, closeBull } from './lib/bull.js';
import { performHealthCheck } from './lib/health.js';

// Module Controllers
import authController from './modules/auth/auth.controller.js';
import servicesController from './modules/services/services.controller.js';
import bookingsController from './modules/bookings/bookings.controller.js';
import usersController from './modules/users/users.controller.js';
import webhooksController from './modules/webhooks/webhooks.controller.js';
import availabilityController from './modules/availability/availability.controller.js';

const app: Express = express();

// Initialize infrastructure services
async function initializeServices() {
  try {
    await initRedis();
    await initRabbitMQ();
    await initBull();
    console.log('✅ All infrastructure services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing - EXCEPT for webhooks (Stripe needs raw body)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health checks
app.get('/health', async (req, res) => {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// API Documentation (Swagger UI)
const openapiPath = resolve(process.cwd(), 'openapi.json');
if (existsSync(openapiPath)) {
  try {
    const openapiSpec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(openapiSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'PeepoPay API Documentation',
      })
    );
    console.log('📚 API Documentation: /api-docs');
  } catch (error) {
    console.warn('⚠️  Failed to load OpenAPI spec, Swagger UI disabled');
  }
} else {
  console.warn('⚠️  OpenAPI spec not found, run: npm run generate:openapi');
}

// API routes (module controllers)
app.use('/api/auth', authController);
app.use('/api/services', servicesController);
app.use('/api/bookings', bookingsController);
app.use('/api/users', usersController);
app.use('/api/webhooks', webhooksController);
app.use('/api/availability', availabilityController);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

async function startServer() {
  // Initialize services first
  await initializeServices();

  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════╗
  ║                                       ║
  ║   🚀 PeepoPay API Server              ║
  ║                                       ║
  ║   Environment: ${config.nodeEnv.padEnd(23)} ║
  ║   Port: ${PORT.toString().padEnd(30)} ║
  ║   URL: ${config.apiUrl.padEnd(31)} ║
  ║   Docs: ${(config.apiUrl + '/api-docs').padEnd(27)} ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
    `);
  });
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} signal received: closing services gracefully`);

  try {
    await closeBull();
    await closeRedis();
    await closeRabbitMQ();
    console.log('✅ All services closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
