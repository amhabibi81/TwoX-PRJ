import express from 'express';
import { 
  generateTeams, 
  getMyTeam, 
  generateTeamsAdmin,
  createTeam,
  addTeamMember,
  removeTeamMember,
  getAllTeamsWithScores
} from '../controllers/team.controller.js';
import auth from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/authorization.middleware.js';
import { ROLES } from '../config/roles.config.js';
import { validateBody, validateQuery } from '../middlewares/validation.middleware.js';
import { 
  teamGenerationSchema, 
  monthYearQuerySchema,
  teamCreationSchema,
  addMemberSchema
} from '../validators/schemas.js';

const router = express.Router();

router.post('/generate', auth, validateBody(teamGenerationSchema), generateTeams);
router.get('/my', auth, getMyTeam);
router.get('/all-with-scores', auth, getAllTeamsWithScores);
router.post('/admin/generate', auth, requireRole(ROLES.ADMIN), validateQuery(monthYearQuerySchema), generateTeamsAdmin);

// Manual team creation and member management (admin only)
router.post('/', auth, requireRole(ROLES.ADMIN), validateBody(teamCreationSchema), createTeam);
router.post('/:teamId/members', auth, requireRole(ROLES.ADMIN), validateBody(addMemberSchema), addTeamMember);
router.delete('/:teamId/members/:userId', auth, requireRole(ROLES.ADMIN), removeTeamMember);

export default router;
