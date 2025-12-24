import express from 'express';
import cors from 'cors';

import './config/env.js';

import authRoutes from './routes/auth.routes.js';
import teamRoutes from './routes/team.routes.js';
import questionRoutes from './routes/question.routes.js';
import resultRoutes from './routes/result.routes.js';
import answerRoutes from './routes/answer.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { securityHeaders } from './middlewares/security.middleware.js';
import { generalRateLimiter } from './middlewares/rateLimit.middleware.js';

const app = express();

// Security headers middleware (apply early)
app.use(securityHeaders);

// CORS - Allow frontend URL from environment variable, or default to localhost for development
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// General rate limiting (apply after security headers, before routes)
app.use(generalRateLimiter);

// Body parser
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/teams', teamRoutes);
app.use('/questions', questionRoutes);
app.use('/results', resultRoutes);
app.use('/answers', answerRoutes);
app.use('/admin', adminRoutes);

export default app;
