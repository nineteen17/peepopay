import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.js';
import { ServicesService } from './services.service.js';

const router = Router();
const servicesService = new ServicesService();

/**
 * Services Controller
 * Handles service-related HTTP requests
 */

// Get all services for authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userServices = await servicesService.getUserServices(req.user!.id);
    res.json({ services: userServices });
  } catch (error) {
    next(error);
  }
});

// Get services for a specific user by slug (public)
router.get('/user/:slug', async (req, res, next) => {
  try {
    const userServices = await servicesService.getServicesByUserSlug(req.params.slug);
    res.json({ services: userServices });
  } catch (error) {
    next(error);
  }
});

// Get single service
router.get('/:id', async (req, res, next) => {
  try {
    const service = await servicesService.getServiceById(req.params.id);
    res.json({ service });
  } catch (error) {
    next(error);
  }
});

// Create service
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const newService = await servicesService.createService(req.user!.id, req.body);
    res.status(201).json({ service: newService });
  } catch (error) {
    next(error);
  }
});

// Update service
router.put('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const updated = await servicesService.updateService(req.params.id, req.user!.id, req.body);
    res.json({ service: updated });
  } catch (error) {
    next(error);
  }
});

// Delete service
router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await servicesService.deleteService(req.params.id, req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
