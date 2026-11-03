import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse({
    body: req.body ?? {},
    query: req.query ?? {},
    params: req.params ?? {},
  });

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.filter((part) => part !== 'body' && part !== 'query' && part !== 'params').join('.'),
      message: issue.message,
    }));
    return next(new ApiError(400, errors[0]?.message || 'Validation failed', errors));
  }

  req.validated = parsed.data;
  return next();
};
