import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { AvailabilityService } from './availability.service.js';

const router = Router();
const availabilityService = new AvailabilityService();

/**
 * Availability Controller
 * Handles availability-related HTTP requests
 */

// Public endpoint - Get available slots for a service provider
// GET /api/availability/:slug?date=YYYY-MM-DD&duration=60
router.get('/:slug', async (req, res, next): Promise<void> => {
  try {
    const { slug } = req.params;
    const { date, duration } = req.query;

    if (!date || !duration) {
      res.status(400).json({
        error: 'Missing required query parameters: date and duration',
      });
      return;
    }

    const serviceDuration = parseInt(duration as string, 10);
    if (isNaN(serviceDuration) || serviceDuration < 15 || serviceDuration > 480) {
      res.status(400).json({
        error: 'Duration must be a number between 15 and 480 minutes',
      });
      return;
    }

    const slots = await availabilityService.getAvailableSlots(
      slug,
      date as string,
      serviceDuration
    );

    res.json({ slots });
  } catch (error) {
    next(error);
  }
});

// Protected endpoints - Tradie manages their availability

// Get my availability rules
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rules = await availabilityService.getAvailabilityRules(req.user!.id);
    res.json({ availability: rules });
  } catch (error) {
    next(error);
  }
});

// Create availability rule
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rule = await availabilityService.createAvailabilityRule(req.user!.id, req.body);
    res.status(201).json({ availability: rule });
  } catch (error) {
    next(error);
  }
});

// Update availability rule
router.put('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rule = await availabilityService.updateAvailabilityRule(
      req.params.id,
      req.user!.id,
      req.body
    );
    res.json({ availability: rule });
  } catch (error) {
    next(error);
  }
});

// Delete availability rule
router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await availabilityService.deleteAvailabilityRule(req.params.id, req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Blocked slots management

// Get blocked slots
router.get('/blocked-slots', requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      res.status(400).json({
        error: 'Missing required query parameters: from and to (ISO date strings)',
      });
      return;
    }

    const slots = await availabilityService.getBlockedSlots(
      req.user!.id,
      new Date(from as string),
      new Date(to as string)
    );

    res.json({ blockedSlots: slots });
  } catch (error) {
    next(error);
  }
});

// Create blocked slot
router.post('/blocked-slots', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const slot = await availabilityService.createBlockedSlot(req.user!.id, req.body);
    res.status(201).json({ blockedSlot: slot });
  } catch (error) {
    next(error);
  }
});

// Delete blocked slot
router.delete('/blocked-slots/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await availabilityService.deleteBlockedSlot(req.params.id, req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
