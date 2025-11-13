import { Router } from 'express';
import { auth } from '../../lib/auth.js';

const router = Router();

/**
 * Auth Controller
 * Handles all Better Auth routes
 */

// Better Auth handles all /api/auth/* routes
router.all('/*', (req, res) => {
  return auth.handler(req);
});

export default router;
