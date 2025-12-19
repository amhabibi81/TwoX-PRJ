import express from 'express';
import { getQuestions } from '../controllers/question.controller.js';
import { validateQuery } from '../middlewares/validation.middleware.js';
import { monthYearQuerySchema } from '../validators/schemas.js';

const router = express.Router();

router.get('/', validateQuery(monthYearQuerySchema), getQuestions);

export default router;
