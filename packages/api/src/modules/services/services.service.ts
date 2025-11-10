import { db } from '../../db/index.js';
import { services, insertServiceSchema, type NewService } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Services Service
 * Handles service-related business logic and database operations
 */
export class ServicesService {
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
   */
  async getServicesByUserSlug(slug: string) {
    const userServices = await db.query.services.findMany({
      where: eq(services.isActive, true),
      with: {
        user: true,
      },
    });

    // Filter by user slug
    return userServices.filter((s) => s.user.slug === slug);
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
