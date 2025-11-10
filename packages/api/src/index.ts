import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/index.js';
import { auth } from './lib/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Routes
import servicesRouter from './routes/services.js';
import bookingsRouter from './routes/bookings.js';
import usersRouter from './routes/users.js';
import webhooksRouter from './routes/webhooks.js';

const app: Express = express();

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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Better Auth routes
app.all('/api/auth/*', (req, res) => {
  return auth.handler(req, res);
});

// API routes
app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/users', usersRouter);
app.use('/api/webhooks', webhooksRouter);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║                                       ║
  ║   🚀 PeepoPay API Server              ║
  ║                                       ║
  ║   Environment: ${config.nodeEnv.padEnd(23)} ║
  ║   Port: ${PORT.toString().padEnd(30)} ║
  ║   URL: ${config.apiUrl.padEnd(31)} ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
