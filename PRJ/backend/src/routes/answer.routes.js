import express from 'express';
import { submitAnswer, getMyAnswers } from '../controllers/answer.controller.js';
import auth from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validation.middleware.js';
import { answerSubmissionSchema } from '../validators/schemas.js';

const router = express.Router();

router.get('/my', auth, getMyAnswers);
router.post('/', auth, validateBody(answerSubmissionSchema), submitAnswer);

export default router;

