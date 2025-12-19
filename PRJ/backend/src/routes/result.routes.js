import express from 'express';
import { getResults } from '../controllers/result.controller.js';
import { validateQuery } from '../middlewares/validation.middleware.js';
import { monthYearQuerySchema } from '../validators/schemas.js';

const router = express.Router();

router.get('/', validateQuery(monthYearQuerySchema), getResults);

export default router;
