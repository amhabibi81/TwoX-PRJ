import express from 'express';
import { 
  submitAnswer, 
  getMyAnswers,
  submitSelfEvaluation,
  submitPeerEvaluation,
  submitManagerEvaluation
} from '../controllers/answer.controller.js';
import auth from '../middlewares/auth.middleware.js';
import { requireAnyRole } from '../middlewares/authorization.middleware.js';
import { ROLES } from '../config/roles.config.js';
import { validateBody } from '../middlewares/validation.middleware.js';
import { 
  answerSubmissionSchema,
  selfEvaluationSchema,
  peerEvaluationSchema,
  managerEvaluationSchema
} from '../validators/schemas.js';

const router = express.Router();

// Get user's answers
router.get('/my', auth, getMyAnswers);

// Submit answer (supports 360-degree with optional evaluatedUserId and sourceType)
router.post('/', auth, validateBody(answerSubmissionSchema), submitAnswer);

// 360-degree evaluation endpoints
router.post('/self', auth, validateBody(selfEvaluationSchema), submitSelfEvaluation);
router.post('/peer', auth, validateBody(peerEvaluationSchema), submitPeerEvaluation);
// Manager evaluation requires admin or manager role
router.post('/manager', auth, requireAnyRole([ROLES.ADMIN, ROLES.MANAGER]), validateBody(managerEvaluationSchema), submitManagerEvaluation);

export default router;

