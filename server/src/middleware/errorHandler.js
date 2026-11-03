import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function errorHandler(err, _req, res, _next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'Record';
      error = new ApiError(409, `${field} already exists`);
    } else if (error instanceof mongoose.Error.CastError) {
      error = new ApiError(400, 'Invalid id');
    } else if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
      error = new ApiError(400, errors[0]?.message || 'Validation failed', errors);
    } else if (error?.type === 'entity.parse.failed') {
      error = new ApiError(400, 'Invalid JSON body');
    }
  }

  const operational = error instanceof ApiError;
  const status = operational ? error.statusCode : 500;
  const message = operational || env.NODE_ENV !== 'production'
    ? error.message || 'Internal server error'
    : 'Internal server error';

  if (!operational) {
    console.error(err);
  }

  const body = { success: false, message };
  if (operational && error.errors) body.errors = error.errors;
  return res.status(status).json(body);
}
