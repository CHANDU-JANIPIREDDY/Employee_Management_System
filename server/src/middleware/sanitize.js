import { ApiError } from '../utils/ApiError.js';

function hasOperator(value) {
  if (!value || typeof value !== 'object') return false;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$')) return true;
    if (hasOperator(value[key])) return true;
  }
  return false;
}

export function rejectOperators(req, _res, next) {
  if (hasOperator(req.body) || hasOperator(req.query) || hasOperator(req.params)) {
    return next(new ApiError(400, 'Invalid request payload'));
  }
  return next();
}
