import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../../lib/auth.js';

const router = Router();

/**
 * Auth Controller
 * Handles all Better Auth routes
 */

// Better Auth handles all /api/auth/* routes
router.all('/*', (req: Request, res: Response, next: NextFunction) => {
  return auth.handler(req, res);
});

export default router;
