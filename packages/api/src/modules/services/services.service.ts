import { db } from '../../db/index.js';
import { services, users, insertServiceSchema, type NewService } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { createCacheService, type CacheService } from '../../lib/redis.js';

/**
 * Services Service
 * Handles service-related business logic and database operations
 */
export class ServicesService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = createCacheService();
  }

  /**
   * Get all services for a user
   */
  async getUserServices(userId: string) {
    return await db.query.services.findMany({
      where: eq(services.userId, userId),
      orderBy: (services, { desc }) => [desc(services.createdAt)],
    });
  }

  /**
   * Get active services for a user by slug (public)
   * Cached for 10 minutes
   */
  async getServicesByUserSlug(slug: string) {
    const cacheKey = `services:user:${slug}`;

    // Try to get from cache
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database using join for better performance
    const user = await db.query.users.findFirst({
      where: eq(users.slug, slug),
      with: {
        services: {
          where: eq(services.isActive, true),
          orderBy: (services, { asc }) => [asc(services.name)],
        },
      },
    });

    const userServices = user?.services || [];

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, userServices, 600);

    return userServices;
  }

  /**
   * Get single service by ID
   */
  async getServiceById(id: string) {
    const service = await db.query.services.findFirst({
      where: eq(services.id, id),
      with: {
        user: true,
      },
    });

    if (!service) {
      throw new AppError(404, 'Service not found');
    }

    return service;
  }

  /**
   * Create a new service
   */
  async createService(userId: string, data: Omit<NewService, 'userId'>) {
    const validatedData = insertServiceSchema.parse({
      ...data,
      userId,
    });

    const [newService] = await db.insert(services).values(validatedData).returning();

    // Get user to clear cache
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user?.slug) {
      await this.cacheService.del(`services:user:${user.slug}`);
    }

    return newService;
  }

  /**
   * Update a service
   */
  async updateService(id: string, userId: string, data: Partial<NewService>) {
    // Verify ownership
    const existing = await db.query.services.findFirst({
      where: and(eq(services.id, id), eq(services.userId, userId)),
    });

    if (!existing) {
      throw new AppError(404, 'Service not found');
    }

    const validatedData = insertServiceSchema.partial().parse(data);

    const [updated] = await db
      .update(services)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();

    // Get user to clear cache
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user?.slug) {
      await this.cacheService.del(`services:user:${user.slug}`);
    }

    return updated;
  }

  /**
   * Delete a service
   */
  async deleteService(id: string, userId: string) {
    // Verify ownership
    const existing = await db.query.services.findFirst({
      where: and(eq(services.id, id), eq(services.userId, userId)),
    });

    if (!existing) {
      throw new AppError(404, 'Service not found');
    }

    await db.delete(services).where(eq(services.id, id));

    // Get user to clear cache
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user?.slug) {
      await this.cacheService.del(`services:user:${user.slug}`);
    }

    return { success: true, message: 'Service deleted successfully' };
  }

  /**
   * Verify service ownership
   */
  async verifyOwnership(serviceId: string, userId: string): Promise<boolean> {
    const service = await db.query.services.findFirst({
      where: and(eq(services.id, serviceId), eq(services.userId, userId)),
    });

    return !!service;
  }
}
