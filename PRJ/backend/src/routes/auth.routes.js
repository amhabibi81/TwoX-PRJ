import express from 'express';
import { signup, login, checkAdminUser } from '../controllers/auth.controller.js';
import { signupRateLimiter, loginRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { validateBody } from '../middlewares/validation.middleware.js';
import { signupSchema, loginSchema } from '../validators/schemas.js';

const router = express.Router();

router.post('/signup', signupRateLimiter, validateBody(signupSchema), signup);
router.post('/login', loginRateLimiter, validateBody(loginSchema), login);
router.get('/admin/check', checkAdminUser);

export default router;
