import { getRedisClient } from './redis.js';
import { getChannel } from './queue.js';
import { db } from '../db/index.js';

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    rabbitmq: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await db.execute`SELECT 1`;
    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const redis = getRedisClient();
    await redis.ping();
    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Check RabbitMQ connectivity
 */
async function checkRabbitMQ(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const channel = getChannel();
    // Check if channel is still active
    if (channel) {
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } else {
      throw new Error('Channel not initialized');
    }
  } catch (error: any) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheck> {
  const [database, redis, rabbitmq] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkRabbitMQ(),
  ]);

  const allHealthy = database.status === 'up' && redis.status === 'up' && rabbitmq.status === 'up';

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database,
      redis,
      rabbitmq,
    },
  };
}
