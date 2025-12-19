import express from 'express';
import { generateTeams, getMyTeam, generateTeamsAdmin } from '../controllers/team.controller.js';
import auth from '../middlewares/auth.middleware.js';
import admin from '../middlewares/admin.middleware.js';
import { validateBody, validateQuery } from '../middlewares/validation.middleware.js';
import { teamGenerationSchema, monthYearQuerySchema } from '../validators/schemas.js';

const router = express.Router();

router.post('/generate', auth, validateBody(teamGenerationSchema), generateTeams);
router.get('/my', auth, getMyTeam);
router.post('/admin/generate', auth, admin, validateQuery(monthYearQuerySchema), generateTeamsAdmin);

export default router;
