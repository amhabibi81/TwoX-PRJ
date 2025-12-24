import express from 'express';
import {
  getDashboardMetrics,
  getTeamParticipation,
  getTeamAverages,
  getUserAverages,
  getPerformers,
  getMonthComparison
} from '../controllers/admin.controller.js';
import auth from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/authorization.middleware.js';
import { ROLES } from '../config/roles.config.js';
import { validateQuery } from '../middlewares/validation.middleware.js';
import { monthYearQuerySchema } from '../validators/schemas.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.get('/dashboard', auth, requireRole(ROLES.ADMIN), validateQuery(monthYearQuerySchema), getDashboardMetrics);
router.get('/dashboard/participation', auth, requireRole(ROLES.ADMIN), validateQuery(monthYearQuerySchema), getTeamParticipation);
router.get('/dashboard/team-averages', auth, requireRole(ROLES.ADMIN), validateQuery(monthYearQuerySchema), getTeamAverages);
router.get('/dashboard/user-averages', auth, requireRole(ROLES.ADMIN), validateQuery(monthYearQuerySchema), getUserAverages);
router.get('/dashboard/performers', auth, requireRole(ROLES.ADMIN), validateQuery(monthYearQuerySchema), getPerformers);
router.get('/dashboard/month-comparison', auth, requireRole(ROLES.ADMIN), validateQuery(monthYearQuerySchema), getMonthComparison);

export default router;
