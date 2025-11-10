import { Router } from 'express';
import { db } from '../db/index.js';
import { services, insertServiceSchema } from '../db/schema/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Get all services for authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userServices = await db.query.services.findMany({
      where: eq(services.userId, req.user!.id),
      orderBy: (services, { desc }) => [desc(services.createdAt)],
    });

    res.json({ services: userServices });
  } catch (error) {
    next(error);
  }
});

// Get services for a specific user by slug (public)
router.get('/user/:slug', async (req, res, next) => {
  try {
    const userServices = await db.query.services.findMany({
      where: and(
        eq(services.isActive, true)
      ),
      with: {
        user: true,
      },
    });

    // Filter by user slug
    const filteredServices = userServices.filter(
      s => s.user.slug === req.params.slug
    );

    res.json({ services: filteredServices });
  } catch (error) {
    next(error);
  }
});

// Get single service
router.get('/:id', async (req, res, next) => {
  try {
    const service = await db.query.services.findFirst({
      where: eq(services.id, req.params.id),
      with: {
        user: true,
      },
    });

    if (!service) {
      throw new AppError(404, 'Service not found');
    }

    res.json({ service });
  } catch (error) {
    next(error);
  }
});

// Create service
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const validatedData = insertServiceSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    const [newService] = await db
      .insert(services)
      .values(validatedData)
      .returning();

    res.status(201).json({ service: newService });
  } catch (error) {
    next(error);
  }
});

// Update service
router.put('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    // Verify ownership
    const existing = await db.query.services.findFirst({
      where: and(
        eq(services.id, req.params.id),
        eq(services.userId, req.user!.id)
      ),
    });

    if (!existing) {
      throw new AppError(404, 'Service not found');
    }

    const validatedData = insertServiceSchema.partial().parse(req.body);

    const [updated] = await db
      .update(services)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(services.id, req.params.id))
      .returning();

    res.json({ service: updated });
  } catch (error) {
    next(error);
  }
});

// Delete service
router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    // Verify ownership
    const existing = await db.query.services.findFirst({
      where: and(
        eq(services.id, req.params.id),
        eq(services.userId, req.user!.id)
      ),
    });

    if (!existing) {
      throw new AppError(404, 'Service not found');
    }

    await db.delete(services).where(eq(services.id, req.params.id));

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
