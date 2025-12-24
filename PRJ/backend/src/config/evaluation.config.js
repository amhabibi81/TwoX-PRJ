/**
 * Evaluation configuration for 360-degree evaluations
 * Weights must sum to 1.0 (100%)
 */

// Evaluation source weights (configurable via environment variables)
export const EVALUATION_WEIGHTS = {
  self: parseFloat(process.env.EVAL_WEIGHT_SELF || '0.20'),    // 20%
  peer: parseFloat(process.env.EVAL_WEIGHT_PEER || '0.50'),    // 50%
  manager: parseFloat(process.env.EVAL_WEIGHT_MANAGER || '0.30') // 30%
};

// Validate weights sum to 1.0
const totalWeight = EVALUATION_WEIGHTS.self + EVALUATION_WEIGHTS.peer + EVALUATION_WEIGHTS.manager;
if (Math.abs(totalWeight - 1.0) > 0.001) {
  throw new Error(`Evaluation weights must sum to 1.0, got ${totalWeight}. Please check EVAL_WEIGHT_SELF, EVAL_WEIGHT_PEER, and EVAL_WEIGHT_MANAGER environment variables.`);
}

// Source type constants
export const SOURCE_TYPES = {
  SELF: 'self',
  PEER: 'peer',
  MANAGER: 'manager'
};

// Valid source types array
export const VALID_SOURCE_TYPES = [SOURCE_TYPES.SELF, SOURCE_TYPES.PEER, SOURCE_TYPES.MANAGER];
