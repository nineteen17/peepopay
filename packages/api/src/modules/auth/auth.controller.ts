import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../lib/auth.js';

const router = Router();

/**
 * Auth Controller
 * Handles all Better Auth routes
 */

// Better Auth handles all /api/auth/* routes
router.all('/*', toNodeHandler(auth));

export default router;
